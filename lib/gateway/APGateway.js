"use strict";

var Es6Promise	            = require("native-promise-only");
var Url						= require("url");
var APRequest 				= require("../request/APRequest");
var APResponse              = require("../response/APResponse");
var APCache                 = require("../cache/APCache");
var APQueue                 = require("../queue/APQueue");
var bind					= require("../utils/bind");
var extend					= require("../utils/extend");
var copy					= require("../utils/copy");
var JSONParser				= require("../parsers/json");
// The parsers/xml.js file is only used on a node env, in browserify a shim will be used (see package.json "browser" field)
var XMLParser				= require("../parsers/xml");
var FormDataParser			= require("../parsers/formData");
var EncodeTransformation	= require("./transformations/encode");
var DecodeTransformation	= require("./transformations/decode");
var hpkp                    = require("../hpkp/hpkp");

/**
 * APGateway class
 * @constructor
 * @param {object} options - cofiguration options for the APGateway
 */
function APGateway(options) {
	this.config = {};

	extend(this.config, APGateway.defaults);

	this.config.url = copy(APGateway.defaults.url);
	this.config.data = copy(APGateway.defaults.data);
	this.config.headers = copy(APGateway.defaults.headers);
	this.config.parsers = copy(APGateway.defaults.parsers);
	this.config.transformations = {
		request: copy(APGateway.defaults.transformations.request),
		response: copy(APGateway.defaults.transformations.response)
	};

	if(options && typeof options.url === "string") {
		var url = Url.parse(options.url);
		var $config = extend({}, options);
		delete $config.url;
		$config.url = url;
		extend(this.config, $config);
	} else {
		extend(this.config, options);
	}

}

/**
 * Static
 */
extend(APGateway, {
		/**
		 * Create an APGateway
		 * @param {object} options - configuration options for the APGateway
		 */
    create: function(options) {
        return new APGateway(options);
    },

		/**
		 * @property {APCache} RequestCache - caches GET requests
		 */
    RequestCache: new APCache("APRequestCache"),

		/**
		 * @property {APQueue} Queue - async request queue, enables pause/resume of request sending
		 */
    Queue: new APQueue(),

		/**
		 * @property {APRequest} APRequest - convenience access to APRequest class constructor
		 */
    APRequest: APRequest,

		/**
		 * @property {APResponse} APResponse - convenience access to APResponse class constructor
		 */
    APResponse: APResponse,

		/**
		 * @property {Promise} Promise - convenience access to native ES2015 Promise implementation
		 */
    Promise: Es6Promise,

		/**
		 * @property {object} defaults - default configuration for any APGateway object
		 */
    defaults: {
        url: {
            href: "http://localhost:5000",
            protocol: "http:",
            hostname: "localhost",
            port: "5000",
            pathname: "/",
            search: null,
            hash: null
        },
        method: "GET",
        silentFail: true,
        cache: true,
        dataType: "json",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        data: {},
        headers: {},
				withCredentials: false,
        parsers: {
            json: JSONParser,
            form: FormDataParser,
            xml: XMLParser
        },
        transformations: {
            request: [ EncodeTransformation ],
            response: [
                DecodeTransformation,
                // Cache response
                function(response) {
                    if(response.cache && response.origin.method === "GET") {
                        APGateway.RequestCache.set(response.origin.url, response);
                    }
                    return response;
                }
            ]
        }
    }
});

/**
 * Methods
 */
extend(APGateway.prototype, {

	/**
	 * Getter/Setter of base url for an APGateway object
	 * @method
	 * @param {string|undefined} url - the base url to set or undefined if being used as a getter
	 * @returns {string|APGateway}
	 */
	url: function(url) {
		if(url) {
			if(typeof url === "string") {
				var $url = Url.parse(url);
				this.config.url = $url;
			}
		} else {
			return this.config.url.href;
		}
		return this;
	},

	/**
	 * Getter/Setter of the http method/verb to use when launching a request
	 * @method
	 * @param {string|undefined} method - can be GET, POST, PUT, PATCH, DELETE or any other verb supported by http, must be capitalized
	 * @returns {string|APGateway}
	 */
	method: function(method) {
		if(method) {
			if(typeof method === "string") {
				this.config.method = method;
			}
		} else {
			return this.config.method;
		}
		return this;
	},

	/**
	 * Getter/Setter of the data being sent in a request
	 * @method
	 * @param {object|undefined} data - the data to be sent
	 * @returns {object|APGateway}
	 */
	data: function(data) {
		if(data) {
			this.config.data = data;
		} else {
			return this.config.data;
		}
		return this;
	},

	/**
	 * Getter/Setter of the type of data expected in the response
	 * @method
	 * @param {string|undefined} dataType - the data type or undefined if used as a getter
	 * @returns {string|APGateway}
	 */
  dataType: function(dataType) {
    if(dataType) {
			if(typeof dataType === "string") {
				this.config.dataType = dataType;
			}
		} else {
			return this.config.dataType;
		}
		return this;
  },

	/**
	 * Getter/Setter of the type of data to send in the request
	 * @method
	 * @param {string|undefined} contentType - the data type or undefined if used as a getter
	 * @returns {string|APGateway}
	 */
	contentType: function(contentType) {
		if(contentType) {
			if(typeof contentType === "string") {
				this.config.contentType = contentType;
			}
		} else {
			return this.config.contentType;
		}
		return this;
	},

	/**
	 * Adds an object containing headers key/value pairs to the current headers to send in the request
	 * If argument is undefined it will return the current headers object
	 * @method
	 * @param {object|undefined} headers
	 * @returns {string|APGateway}
	 */
	headers: function(headers) {
		if(headers) {
			if(typeof headers === "object") {
				extend(this.config.headers, headers);
			}
		} else {
			return this.config.headers;
		}
		return this;
	},

	/**
	 * Getter/Setter for withCredentials flag, it will only set the value is a type boolean is passed
	 * @method
	 * @param {boolean|undefined} withCredentials
	 * @returns {boolean|APGateway}
	 */
	withCredentials: function(withCredentials) {
		if(typeof withCredentials === "boolean") {
			this.config.withCredentials = withCredentials;
		} else {
			return this.config.withCredentials;
		}
		return this;
	},

	/**
	 * Getter/Setter for silent fail flag, it will only set the value if a boolean is passed
	 * If true, the APGateway will catch any errors triggered from a request and fail silently
	 * @method
	 * @param {boolean|undefined} silent
	 * @returns {boolean|APGateway}
	 */
	silentFail: function(silent) {
		if(typeof silent === "boolean") {
			this.config.silentFail = silent;
		} else {
			return this.config.silentFail;
		}
		return this;
	},

	/**
	 * Getter/Setter for caching flag, it will only set the value if a boolean is passed
	 * @method
	 * @param {boolean|undefined} active
	 * @returns {boolean|APGateway}
	 */
  cache: function(active) {
      if(typeof active === "boolean") {
          this.config.cache = active;
      } else {
          return this.config.cache;
      }
      return this;
  },

	/**
	 * Creates a new instance of APGateway with all configuration copied from the original one
	 * Configuration is not deeply copied.
	 * @method
	 * @returns {APGateway} - the copy of the APGateway
	 */
	copy: function() {
		var gw = new APGateway(this.config);
		gw.headers(copy(this.headers()));
		gw.data(copy(this.data()));
		gw.config.parsers = copy(this.config.parsers);
		gw.requestTransformations(copy(this.config.transformations.request));
		gw.responseTransformations(copy(this.config.transformations.response));
		return gw;
	},

	/**
	 * Getter/Setter of request transformations, it will only set if the argument is an instance of Array
	 * Request transformations are a pipeline of functions to be applied to the request object before sent
	 * @method
	 * @param {Array} transformations - the transformations to use on the request
	 * @returns {Array|APGateway}
	 */
	requestTransformations: function(transformations) {
		if(transformations) {
			if(transformations instanceof Array) {
				this.config.transformations.request = transformations;
			}
		} else {
			return this.config.transformations.request;
		}
		return this;
	},

	/**
	 * Getter/Setter of response transformations, it will only set if the argument is an instance of Array
	 * Response transformations are a pipeline of functions to be applied to the response object when the request comes back
	 * @method
	 * @param {Array} transformations - the transformations to use on the response
	 * @returns {Array|APGateway}
	 */
	responseTransformations: function(transformations) {
		if(transformations) {
			if(transformations instanceof Array) {
				this.config.transformations.response = transformations;
			}
		} else {
			return this.config.transformations.response;
		}
		return this;
	},

	/**
	 * Adds a request transformation to the current pipeline
	 * @method
	 * @param {function} transformation - the transformation to add
	 * @returns {APGateway}
	 */
	addRequestTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.request.push(transformation);
		}
		return this;
	},

	/**
	 * Adds a response transformation to the current pipeline
	 * @method
	 * @param {function} transformation - the transformation to add
	 * @returns {APGateway}
	 */
	addResponseTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.response.push(transformation);
		}
		return this;
	},

	/**
	 * Sets Http public key pinning headers on the APGateway
	 * @method
	 * @param {object} options
	 * 			hpkp options must include:
	 * 			{
	 *				sha256s {Array} - two sha256 encoded keys (one is used as backup)
	 *				maxAge {number} - max amount of time in seconds that the browser will enforce the specified public key
 	 *			}
	 *			other optional keys:
	 *			{
	 *				includeSubdomains {boolean} - whether to enfore public key rule on subdomains
	 *				reportOnly {boolean} - whether to use Public-Key-Pins-Report-Only mode instead of Public-Key-Pins
	 *				reportUri {string} - the URI to report failures to
	 *			}
	 * @returns {APGateway}
	 */
  hpkp: function(options) {
      var header = hpkp(options.sha256s, options.maxAge, options.includeSubdomains, options.reportOnly, options.reportUri);
      this.headers(header);
      return this;
  },

	/**
	 * Execute the process of sending a request, including caching, applying the transformation pipeline, etc.
	 * @method
	 * @returns {Promise}
	 */
	execute: function() {
		var i;
		var reqTrans = this.config.transformations.request,
			options,
			request,
            requestKey,
			$config = extend({}, this.config, {
				url: copy(this.config.url),
				headers: copy(this.config.headers),
				parsers: copy(this.config.parsers)
			});

		// Remove transformations from the request options so they can't be modified on the fly
		delete $config.transformations;
		options = $config;
		for(i=0; i<reqTrans.length; i++) {
			options = reqTrans[i](options);
		}
		request = new APRequest(options);

    requestKey = request.fullUrl();

    if(this.config.cache && request.method === "GET") {
        return APGateway.RequestCache.get(requestKey).then(bind(this, function(value) {
            if(value !== undefined) {
                var res = new APResponse();
                extend(res, value);
                return res;
            } else {
                return this.sendRequest(request);
            }
        }));
    } else {
        return this.sendRequest(request);
    }
	},

	/**
	 * Send the request to the queue and returns a Promise to be resolved with the response
	 * @method
	 * @param {APRequest} - the request to send
	 * @returns {Promise}
	 */
  sendRequest: function(request) {
      var self = this;
      return new Es6Promise(function(resolve, reject) {
          APGateway.Queue.queue(request, function(req) {
              var responseTransformations = self.responseTransformations();
              var promise = req.send();
              for(var i=0; i<responseTransformations.length; i++) {
                  promise.then(responseTransformations[i]);
              }
              if(self.silentFail()) {
                  promise.catch(function(e) { return; });
              }
              resolve(promise);
          });
      });
  }
});

module.exports = APGateway;
