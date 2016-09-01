(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var Gateway = require('./lib/gateway/gateway');

if(typeof window !== 'undefined') {
	window.Gateway = Gateway;
}

module.exports = Gateway;

},{"./lib/gateway/gateway":4}],2:[function(require,module,exports){
"use strict";

var Es6Promise	    = require("native-promise-only");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var defaultStorage  = require("./persistence/memory-storage");

/**
 * Cache class, supports caching and expiration of key/value pairs (also persistence depending on the persistence strategy used)
 * @constructor
 * @param {string} prefix - A prefix used to identify a particular instance of Cache (depending on the underlaying persistence strategy it might not be needed)
 */
function Cache(prefix) {
    this.prefix = prefix;
    this.storage = Cache.defaults.storage;
    this.ttl = Cache.defaults.ttl;
    this.expirationCheck = Cache.defaults.expirationCheck;
}

/**
 * Default configuration for any Cache instance
 * @property {object} defaults
 */
Cache.defaults = {

   storage: defaultStorage,

   ttl: 604800000,

   expirationCheck: 600,

   /**
   * Sets a key/value into the cache
   * @param {any} key
   * @param {any} value
   * @returns {Promise}
   */
   set: function(key, value) {
       if(key !== undefined && key !== null && value !== undefined && value !== null) {
           var serialized = this.cacheKey(key);
           var fullValue = { value: value, timestamp: (new Date()).toJSON() };
           return this.storage.set(serialized, fullValue);
       }
       return Es6Promise.resolve(undefined);
   },

   /**
    * Retrieves a key from the cache by key
    * @param {any} key
    * @returns {Promise}
    */
   get: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.get(serialized).then(bind(this, function(record) {
               var isAlive = this.checkTTL(record);
               return (isAlive) ? record.value : undefined;
           }));
       }
       return Es6Promise.resolve(undefined);
   },

   /**
    * Gets all key/value pairs saved in this cache
    * @returns {Promise}
    */
   getAll: function() {
       return this.storage.getAll(this.prefix).then(bind(this, function(all) {
           var isAlive = true, pairs = {};
           for(var key in all) {
               if(all.hasOwnProperty(key)) {
                   isAlive = this.checkTTL(all[key]);
                   if(!isAlive) {
                       this.remove(key);
                       delete all[key];
                   } else {
                       pairs[key] = all[key].value;
                   }
               }
           }
           return all;
       }));
   },

   /**
    * Removes a value from the cache by key
    * @param {any} key
    * @returns {Promise}
    */
   remove: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.remove(serialized);
       }
       return Es6Promise.resolve(undefined);
   },

   /**
    * Checks if a key/value pair has gone stale based on the TTL specified in the configuration
    * @param {object} record - an object containing the value retrieved from the cache and its timestamp (added when setting it)
    * @returns {boolean} - true if the key/value is still valid, false otherwise
    */
   checkTTL: function(record) {
       var isAlive = false, now = new Date(), diff;
       if(record !== undefined && record !== null && record.timestamp) {
           var ts = new Date(record.timestamp);
           diff = Math.abs(ts - now);
           isAlive = diff < this.ttl;
       }
       return isAlive;
   },

   /**
    * Builds a string key
    * @param {any} key
    * @returns {string} - the built key
    */
   cacheKey: function(key) {
       var serialized = "", keyString = "";
       if(key !== undefined && key !== null) {
           if(typeof this.prefix === "string") {
               serialized += this.prefix + "::";
           }
           serialized += (typeof key !== "string") ? JSON.stringify(key) : key;
       }
       return serialized;
   },

   /**
    * Removes all entries from the cache
    */
   flush: function() {
       return this.storage.flush(this.prefix);
   }
};

extend(Cache.prototype, {
   set: Cache.defaults.set,
   get: Cache.defaults.get,
   getAll: Cache.defaults.getAll,
   remove: Cache.defaults.remove,
   checkTTL: Cache.defaults.checkTTL,
   cacheKey: Cache.defaults.cacheKey,
   flush: Cache.defaults.flush,

   /**
    * Triggers an async cycle to remove keys that have expired
    * @returns {Cache}
    */
   startCleanupCycle: function() {
       this.cleanupCycle = setInterval(bind(this, function() {
           var isAlive = true;
           this.getAll().then(bind(this, function(allRecords) {
              for(var key in allRecords) {
                  if(allRecords.hasOwnProperty(key)) {
                      isAlive = this.checkTTL(allRecords[key]);
                      if(!isAlive) {
                          this.remove(key);
                      }
                  }
              }
           }));
       }), this.expirationCheck*1000);
       return this;
   },

   /**
    * Stops the expiration checking cycle
    * @returns {Cache}
    */
   stopCleanupCycle: function() {
       if(this.cleanupCycle) {
           clearInterval(this.cleanupCycle);
       }
       return this;
   }
});


module.exports = Cache;

},{"../utils/bind":20,"../utils/extend":22,"./persistence/memory-storage":3,"native-promise-only":24}],3:[function(require,module,exports){
"use strict";

var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

/**
 * BrowserStorage class is a persistence strategy used by default when running in the browser
 * It uses localStorage internally to persist data
 * Since BrowserStorage is global to all Cache instances, it uses prefixes to multiplex the localStorage space
 * and keep the contents of each cache separate
 * @constructor
 */
function BrowserStorage() {
    if(typeof window.localStorage !== "undefined") {
        this.store = window.localStorage;
    } else {
        throw new Error("window.localStorage is required for BrowserStorage.");
    }
}

extend(BrowserStorage.prototype, {
   /**
    * Returns all the keys stored with the passed prefix prepended on each of them.
    * @method
    * @param {string} prefix - the prefix to prepend on each key
    * @returns {Array} - list of all keys
    */
   keysWithPrefix: function(prefix) {
       var results = [], pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results.push(key);
           }
       }
       return results;
   },

   /**
    * Finds all keys belonging to a specific prefix
    * @method
    * @param {string} prefix
    * @returns {object} - all key/value pairs that belong to the prefix
    */
   findByPrefix: function(prefix) {
       var results = {}, pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results[key] = JSON.parse(this.store.getItem(key));
           }
       }
       return results;
   },

   /**
    * Sets a key/value pair
    * @method
    * @param {string} key
    * @param {any} value
    * @returns {Promise}
    */
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.setItem(key, JSON.stringify(value));
            resolve();
       }));
   },

   /**
    * Gets a value by key
    * @method
    * @param {string} key
    * @returns {Promise}
    */
   get: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            var record = {}, item = JSON.parse(this.store.getItem(key));
            if(item !== null && item !== undefined && typeof item === "object") {
                record.timestamp = item.timestamp;
                record.value = item.value;
            }
            resolve(record);
       }));
   },

   /**
    * Gets all values by prefix. It uses findByPrefix internally.
    * @method
    * @param {string} prefix
    * @returns {Promise}
    */
   getAll: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var result = {};
            if(typeof prefix === "string" && prefix !== "") {
                result = this.findByPrefix(prefix);
            }
            resolve(result);
       }));
   },

   /**
    * Removes a value by key
    * @method
    * @param {string} key
    * @returns {Promise}
    */
   remove: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.removeItem(key);
            resolve(true);
       }));
   },

   /**
    * Removes all values belonging to a prefix
    * @method
    * @param {string} prefix
    * @returns {Promise}
    */
   flush: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var keys = this.keysWithPrefix(prefix);
            for(var i=0 ; i < keys.length ; i++) {
                this.remove(keys[i]);
            }
            resolve(true);
       }));
   }
});

module.exports = new BrowserStorage();

},{"../../utils/bind":20,"../../utils/extend":22,"native-promise-only":24}],4:[function(require,module,exports){
"use strict";

var Es6Promise	            = require("native-promise-only");
var Url						= require("url");
var APRequest 				= require("../request/APRequest");
var APResponse              = require("../response/APResponse");
var Cache                 = require("../cache/cache");
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
 * Gateway class
 * @constructor
 * @param {object} options - cofiguration options for the Gateway
 */
function Gateway(options) {
	this.config = {};

	extend(this.config, Gateway.defaults);

	this.config.url = copy(Gateway.defaults.url);
	this.config.data = copy(Gateway.defaults.data);
	this.config.headers = copy(Gateway.defaults.headers);
	this.config.parsers = copy(Gateway.defaults.parsers);
	this.config.transformations = {
		request: copy(Gateway.defaults.transformations.request),
		response: copy(Gateway.defaults.transformations.response)
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
extend(Gateway, {
		/**
		 * Create an Gateway
		 * @param {object} options - configuration options for the Gateway
		 */
    create: function(options) {
        return new Gateway(options);
    },

		/**
		 * @property {Cache} RequestCache - caches GET requests
		 */
    RequestCache: new Cache("APRequestCache"),

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
		 * @property {object} defaults - default configuration for any Gateway object
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
        data: {},
        headers: {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
				},
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
                        Gateway.RequestCache.set(response.origin.url, response);
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
extend(Gateway.prototype, {

	/**
	 * Getter/Setter of base url for an Gateway object
	 * @method
	 * @param {string|undefined} url - the base url to set or undefined if being used as a getter
	 * @returns {string|Gateway}
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
	 * @returns {string|Gateway}
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
	 * @returns {object|Gateway}
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
	 * @returns {string|Gateway}
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
	 * @returns {string|Gateway}
	 */
	contentType: function(contentType) {
		var headers, contentTypeHeader;
		if (contentType) {
			if (typeof contentType === 'string') {
				this.headers({'Content-Type': contentType});
			}
		} else {
			headers = this.headers();
			if (headers) {
				contentTypeHeader = headers['Content-Type'];
			}
			return contentTypeHeader;
		}
		return this;
	},

	/**
	 * Adds an object containing headers key/value pairs to the current headers to send in the request
	 * If argument is undefined it will return the current headers object
	 * @method
	 * @param {object|undefined} headers
	 * @returns {string|Gateway}
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
	 * @returns {boolean|Gateway}
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
	 * If true, the Gateway will catch any errors triggered from a request and fail silently
	 * @method
	 * @param {boolean|undefined} silent
	 * @returns {boolean|Gateway}
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
	 * @returns {boolean|Gateway}
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
	 * Creates a new instance of Gateway with all configuration copied from the original one
	 * Configuration is not deeply copied.
	 * @method
	 * @returns {Gateway} - the copy of the Gateway
	 */
	copy: function() {
		var gw = new Gateway(this.config);
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
	 * @returns {Array|Gateway}
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
	 * @returns {Array|Gateway}
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
	 * @returns {Gateway}
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
	 * @returns {Gateway}
	 */
	addResponseTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.response.push(transformation);
		}
		return this;
	},

	/**
	 * Sets Http public key pinning headers on the Gateway
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
	 * @returns {Gateway}
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
        return Gateway.RequestCache.get(requestKey).then(bind(this, function(value) {
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
          Gateway.Queue.queue(request, function(req) {
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

module.exports = Gateway;

},{"../cache/cache":2,"../hpkp/hpkp":7,"../parsers/formData":8,"../parsers/json":9,"../parsers/xml":18,"../queue/APQueue":10,"../request/APRequest":12,"../response/APResponse":13,"../utils/bind":20,"../utils/copy":21,"../utils/extend":22,"./transformations/decode":5,"./transformations/encode":6,"native-promise-only":24,"url":17}],5:[function(require,module,exports){
"use strict";

/**
 * Decodes a response's data from XML or JSON into an object, based on the content type of the response (which is the data type of the request that originated it)
 * @param {APResponse}
 * @returns {APResponse}
 */
function decode(response) {
	if(typeof response.parsers === "object") {
		switch(response.contentType) {
			case "xml":
				response.data = response.parsers.xml.parse(response.data);
				break;
			case "json":
				response.data = response.parsers.json.parse(response.data);
				break;
		}
	}
	return response;
}

module.exports = decode;

},{}],6:[function(require,module,exports){
"use strict";

/**
 * Encodes a request's data into XML, JSON or FormData based on the request content type
 * @param {APRequest}
 * @returns {APRequest}
 */
function encode(request) {
	var	headers = request.headers,
			contentType;

	if (headers) {
		contentType = headers['Content-Type'];
	}

	if (contentType && (request.method !== 'GET')) {
		switch (contentType) {
			case "application/x-www-form-urlencoded; charset=UTF-8":
				request.data = request.parsers.form.serialize(request.data);
				break;
			case "application/xml":
				request.data = request.parsers.xml.serialize(request.data);
				break;
			case "application/json":
				request.data = request.parsers.json.serialize(request.data);
				break;
		}
	} else {
		var paramArray = [], params = "";
		if(typeof request.data === "object") {
			for(var key in request.data) {
				if(request.data.hasOwnProperty(key)) {
					paramArray.push(key+"="+request.data[key]);
				}
			}
			params = paramArray.sort().join("&");
		}
		if(params !== "") {
			params = "?"+params;
		} else {
			params = null;
		}
		request.url.search = params;
	}
	return request;
}


module.exports = encode;

},{}],7:[function(require,module,exports){
"use strict";

/**
 * Validates that the arguments passed are complete and of the correct type
 * Returns true if arguments valid, false otherwise
 * @param {Array} sha256s - an array of two sha256 encoded string keys
 * @param {number} maxAge
 * @param {boolean} includeSubdomains - optional
 * @param {boolean} reportOnly - optional, but if included there must be a valid reportUri argument
 * @param {string} reportUri - optional
 * @returns {boolean} - true if arguments are valid, false otherwise
 */
function validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(!sha256s ||  !(sha256s instanceof Array) || sha256s.length < 2) {
        return false;
    }
    if(!maxAge) {
        return false;
    }
    if(!!reportOnly && (!reportUri || typeof reportUri !== "string" || reportUri === "")) {
        return false;
    }
    return true;
}

/**
 * Returns the string name of the header to use in hpkp
 * @param {boolean} reportOnly - whether the mode is report-only
 * @returns {string} - the http header name for hpkp
 */
function headerName(reportOnly) {
    var name = "Public-Key-Pins";
    if(reportOnly) {
        name += "-Report-Only";
    }
    return name;
}

/**
 * Returns the value to send within the hpkp header
 * @param {Array} sha256s - an array of two sha256 encoded string representing the public key to pin (one of them is used as backup)
 * @param {number} maxAge - the maximum ammount of time, in seconds, that the public key pinning should be enforced by the browser
 * @param {boolean} includeSubdomains - optional, whether the pinning rule should apply to subdomains as well
 * @param {string} reportUri - optional, the URI string to send error reports to
 * @returns {string} - the full value to send in the hpkp header
 */
function headerValue(sha256s, maxAge, includeSubdomains, reportUri) {
    var values = [];
    for(var i=0 ; i < sha256s.length ; i++) {
        values.push('pin-sha256="' + sha256s[i] + '"');
    }

    values.push('max-age=' + Math.round(maxAge));

    if(!!includeSubdomains) {
        values.push('includeSubdomains');
    }

    if(reportUri) {
        values.push('report-uri="' + reportUri + '"');
    }

    return values.join('; ');
}

/**
 * Wrapper function for the entire module
 * @param {Array} sha256s - an array of two sha256 encoded string representing the public key to pin (one of them is used as backup)
 * @param {number} maxAge - the maximum ammount of time, in seconds, that the public key pinning should be enforced by the browser
 * @param {boolean} includeSubdomains - optional, whether the pinning rule should apply to subdomains as well
 * @param {boolean} reportOnly - wheter the mode is report-only
 * @param {string} reportUri - optional, the URI string to send error reports to
 * @return {object} - an object with one key/value which are the header name as key, and the header value as value
 */
module.exports = function hpkp(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri)) {
        var headerName = headerName(reportOnly);
        var headerValue = headerValue(sha256s, maxAge, includeSubdomains, reportUri);
        var header = {};
        header[headerName] = headerValue;
        return header;
    }
    return {};
};

},{}],8:[function(require,module,exports){
"use strict";

/**
 * Encodes a javascript object as form-data
 * @param {object} data
 * @returns {string} - encoded data
 */
function encodeToFormData(data) {
	var urlEncodedData = "", urlEncodedDataPairs = [];

	if(data) {
		if(typeof data === "object") {
			// We turn the data object into an array of URL encoded key value pairs.
			for(var name in data) {
				urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
			}
			// We combine the pairs into a single string and replace all encoded spaces to
			// the plus character to match the behaviour of the web browser form submit.
			urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');
		}
	}
	return urlEncodedData;
}

module.exports = {
	serialize: function(data) {
		return encodeToFormData(data);
	},
	parse: function(data) {
		// Void function to adhere to common parser interface
		return data;
	}
};

},{}],9:[function(require,module,exports){
"use strict";

module.exports = {
	/**
	 * Serializes a javascript object as a JSON string
	 * @param {object} data
	 * @returns {string} - encoded data
	 */
	serialize: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},

	/**
	 * Converts a JSON string into a javascript object
	 * @param {string} json
	 * @returns {object}
	 */
	parse: function(json) {
		var parsed;
		try {
			parsed = (json) ? JSON.parse(json) : undefined;
		} catch(e) {
			parsed = undefined;
		}
		return parsed;
	}
};

},{}],10:[function(require,module,exports){
"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var Interval        = require("../utils/Interval");
var APQueueMessage  = require("./APQueueMessage");

/**
 * Asynchronous queue used to dispatch requests to an API
 * @constructor
 */
function APQueue() {
    this.active = true;
    this.messages = [];
    this.dequeueLoop = null;
    this.throttleDequeueBy = 300;
}

extend(APQueue.prototype, {

    /**
     * Adds an element to the queue
     * A callback can be passed which will be called when that element is dispatched from the queue
     * @method
     * @param {any} element - the element to queue
     * @param {function} fn - optional, callback to call when the element is dequeued
     * @returns {APQueueMessage}
     */
    queue: function(element, fn) {
        var message = new APQueueMessage(element);
        if(typeof fn === "function") {
            message.on("dispatch", fn);
        }

        this.messages.push(message);

        if(this.active && this.messages.length === 1) {
            this.dequeue();
        }

        return message;
    },

    /**
     * Flushes the queue
     * Flushing is done using a async loop that will be throttled based on the config of APQueue
     * @method
     * @returns {APQueue}
     */
    dequeue: function() {
        if(this.dequeueLoop === null) {
            this.dequeueLoop = new Interval(bind(this, function() {
                if(this.active && this.messages.length > 0) {
                    var message = this.messages.shift();
                    message.emit("dispatch", message.content);
                } else {
                    this.dequeueLoop.cancel();
                    this.dequeueLoop = null;
                }
            }), this.throttleDequeueBy, undefined, true);
        }
        return this;
    },

    /**
     * Pauses the queue, in other words it blocks the dequeuing loop from running
     * @method
     * @returns {APQueue}
     */
    pause: function() {
        this.active = false;
        return this;
    },

    /**
     * Removes blocks on the dequeuing loop and restarts the loop
     * @method
     * @returns {APQueue}
     */
    resume: function() {
        this.active = true;
        this.dequeue();
        return this;
    },

    /**
     * Sets the time in milliseconds used to throttle the dequeuing loop
     * Throttling prevents an API to become flooded in situations when the queue has accumulated a lot of requests
     * @method
     * @param {number} milliseconds
     * @returns {APQueue}
     */
    throttleBy: function(milliseconds) {
        if(typeof milliseconds === "number") {
            this.throttleDequeueBy = milliseconds;
        }
        return this;
    },

    /**
     * Returns all of the elements in the queue
     * Its main purpose is to allow users to persist the contents of the queue to a database or localStorage if they choose to
     * The queue must be paused to be able to export because otherwise looping over its contents can be unsafe
     * @method
     * @returns {Array} - the contents of the queue
     * @throws {Error} - if the queue is not paused before exporting
     */
    export: function() {
        if(!this.active) {
            var len = this.messages.length;
            var messages = [];
            for(var i=0; i<len; i++) {
                messages.push(this.messages[i].content);
            }
        } else {
            throw new Error("APQueue must be paused to exportable");
        }
    }

});

module.exports = APQueue;

},{"../utils/Interval":19,"../utils/bind":20,"../utils/extend":22,"./APQueueMessage":11,"tiny-emitter":25}],11:[function(require,module,exports){
"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");

/**
 * Wraps an element in an EventEmitter
 * @constructor
 */
function APQueueMessage(content) {
    this.content = content;
}

APQueueMessage.prototype = new EventEmitter();
APQueueMessage.prototype.constructor = APQueueMessage;

module.exports = APQueueMessage;

},{"../utils/extend":22,"tiny-emitter":25}],12:[function(require,module,exports){
"use strict";

var Es6Promise	    = require("native-promise-only");
// The http module is only used in a node environment, when using with browserify
// it will be replaced with a shim (see package.json "browser" and shims folder)
var http			= require("http");

var extend			= require("../utils/extend");
var copy			= require("../utils/copy");
var bind 			= require("../utils/bind");
var APResponse		= require("../response/APResponse");

/**
 * Represents a single request
 * @constructor
 * @param {object} options - the configuration for the request (see Gateway)
 */
function APRequest(options) {
	options = options || {};
	extend(this, options);
}


/**
 * Methods
 */
extend(APRequest.prototype, {

	/**
	 * Builds a url (without the protocol) from the individual pieces
	 * @method
	 * @returns {string} - the url string
	 */
	urlPath: function() {
    var path = (this.url.pathname) ? this.url.pathname : "";
		path += (this.url.search) ? this.url.search : "";
		path += (this.url.hash) ? this.url.hash : "";
    return path;
  },

	/**
	 * Builds a url (with the protocol), this method is used to append the url to the APResponse before returning it
	 * @method
	 * @returns {string} - the url string
	 */
  fullUrl: function() {
      var url = this.url.protocol + "//" + this.url.hostname;
      if(this.url.port !== null && this.url.port !== undefined && this.url.port !== "") {
          url += ":" + this.url.port;
      }
      url += this.urlPath();
      return url;
  },

	/**
	 * Sends the request using http module
	 * @method
	 * @returns {Promise}
	 */
	send: function() {
    var path = this.urlPath();
		var headers = copy(this.headers);
		var self = this;
		
		return new Es6Promise(function(resolve, reject) {
			var req = http.request({
				protocol: self.url.protocol,
				hostname: self.url.hostname,
				port: self.url.port,
				path: path,
				method: self.method,
				headers: headers,
				withCredentials: self.withCredentials
			}, function(res) {
				var data = "";
				res.on("data", function(chunk) {
					data += chunk;
				});

				res.on("end", function() {
					// Create APResponse and finish
					var apResponse = new APResponse(res, self.dataType, data, self.cache);
					apResponse.parsers = self.parsers;
        	apResponse.origin = { method: self.method, url: self.fullUrl() };
					resolve(apResponse);
				});
			});

			req.on("error", function(e) {
				reject(e);
			});

			if(self.method !== "GET") {
				req.write(self.data);
			}

			req.end();
		});
	}
});

module.exports = APRequest;

},{"../response/APResponse":13,"../utils/bind":20,"../utils/copy":21,"../utils/extend":22,"http":16,"native-promise-only":24}],13:[function(require,module,exports){
"use strict";

var extend	= require("../utils/extend");

/**
 * Represents a single response to a request
 * @constructor
 * @param {HttpResponse} response - the actual response from the http module
 * @param {string} dataType - the type of content expected in the response
 * @param {string} data - the full data from the response
 * @param {boolean} cache - whether the response should be cached
 */
function APResponse(response, dataType, data, cache) {
	extend(
		this,
		APResponse.defaults,
		response,
		{ data: data, contentType: dataType, cache: cache }
	);
}

APResponse.defaults = {
	statusCode: 0,
	statusMessage: "",
	data: {},
	headers: {},
  cache: false
};

module.exports = APResponse;

},{"../utils/extend":22}],14:[function(require,module,exports){
"use strict";

var extend			= require("../../utils/extend");
var copy			= require("../../utils/copy");
var bind			= require("../../utils/bind");
var HttpResponse	= require("./HttpResponse");
var EventEmitter 	= require("tiny-emitter");

/**
 * Tries to simulate the minimal behaviour of node's http.ClientRequest
 * @constructor
 * @param {object} options - the request configuration
 */
function HttpRequest(options) {
	this.url = "";
	this.method = options.method;
	this.headers = copy(options.headers);
	this.withCredentials = options.withCredentials;

	if(typeof options === "object") {
		this.url = options.protocol + "//" + options.hostname + ":" + options.port + options.path;
	}

	this.detectEnv();
}

HttpRequest.prototype = new EventEmitter();
HttpRequest.prototype.constructor = HttpRequest;

/**
 * Static
 */
HttpRequest.states = {
	'UNSENT'			: 0,
	'OPENED'			: 1,
	'HEADERS_RECEIVED'	: 2,
	'LOADING'			: 3,
	'DONE'				: 4
};

HttpRequest.env = {
	modern	: 0,
	ie8		: 1,
	ie6		: 2
};

extend(HttpRequest.prototype, {

	/**
	 * Sets the data to send in a request
	 * @method
	 * @param {string} data - the data to send
	 */
	write: function(data) {
		this.data = data;
	},

	/**
	 * Sends the request
	 */
	end: function() {
		var xhr;

		switch(this.env) {
			case HttpRequest.env.modern:
				xhr = new window.XMLHttpRequest();
				break;
			case HttpRequest.env.ie8:
				xhr = new window.XDomainRequest();
				break;
			case HttpRequest.env.ie6:
				xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
				break;
		}

		xhr.open(this.method, this.url, true);
		xhr.withCredentials = !!this.withCredentials;

		if(typeof this.headers === "object") {
			for(var key in this.headers) {
				if(this.headers.hasOwnProperty(key)) {
					xhr.setRequestHeader(key, this.headers[key]);
				}
			}
		}

		this.addOnChangeListener(xhr, bind(this, function() {
			if(xhr.readyState === HttpRequest.states.DONE) {
				var response = new HttpResponse(xhr);
				if(xhr.status >= 200 && xhr.status < 400) {
					this.emit("done", response);
					response.emit("data", response.data);
					response.emit("end");
				} else {
					this.emit("error", new Error("Request failed -> "+response.statusCode+", "+response.text));
				}
			}
		}));

		xhr.ontimeout = bind(this, function() {
			var response = new HttpResponse(xhr);
			this.emit("error", new Error("Request timeout -> "+response.statusCode+", "+response.text));
		});

		xhr.send(this.data);
	},

	/**
	 * Detects the object type to use to send the request
	 * @method
	 */
	detectEnv: function() {
		if(typeof XMLHttpRequest !== "undefined") {
			this.env = HttpRequest.env.modern;
		} else if(typeof XDomainRequest !== "undefined") {
			this.env = HttpRequest.env.ie8;
		} else if(typeof ActiveXObject !== "undefined") {
			this.env = HttpRequest.env.ie6;
		}
	},

	/**
	 * Adds a function to execute when the state of the request changes
	 * Its needed since the different type of objects like XMLHttpRequest and XDomainRequest
	 * use different fields to set the change listener
	 * @method
	 * @param {XMLHttpRequest|XDomainRequest|ActiveXObject} xhr
	 * @param {function} fn - callback
	 */
	addOnChangeListener: function(xhr, fn) {
		switch(this.env) {
			case HttpRequest.env.modern:
			case HttpRequest.env.ie6:
				xhr.onreadystatechange = fn;
				break;
			case HttpRequest.env.ie8:
				xhr.onload = fn;
				break;
		}
	}
});


module.exports = HttpRequest;

},{"../../utils/bind":20,"../../utils/copy":21,"../../utils/extend":22,"./HttpResponse":15,"tiny-emitter":25}],15:[function(require,module,exports){
"use strict";

var extend		= require("../../utils/extend");
var EventEmitter = require("tiny-emitter");

/**
 * Tries to emulate the minimum needed functionality of node's http.IncomingMessage object as it is used in the "http" module
 * @constructor
 * @param {XMLHttpRequest|XDomainRequest|ActiveXObject} xhr - the native request object that originated the response
 */
function HttpResponse(xhr) {
	this.statusCode = xhr.status;
	this.statusMessage = xhr.statusText;
	this.headers = this.parseHeaders(xhr.getAllResponseHeaders());
	if(xhr.responseText !== "") {
		this.data = xhr.responseText;
	} else if(xhr.responseXml !== "") {
		this.data = xhr.responseXml;
	}
}

HttpResponse.prototype = new EventEmitter();
HttpResponse.prototype.constructor = HttpResponse;

extend(HttpResponse.prototype, {

	/**
	 * Parses the response headers string into key/value pairs
	 * @method
	 * @param {string} headerStr - the string with the response headers
	 * @returns {object} - headers key/value pairs
	 */
	parseHeaders: function (headerStr) {
		var headers = {};
		if (!headerStr) {
			return headers;
		}
		var headerPairs = headerStr.split('\u000d\u000a');
		for (var i = 0, ilen = headerPairs.length; i < ilen; i++) {
			var headerPair = headerPairs[i];
			var index = headerPair.indexOf('\u003a\u0020');
			if (index > 0) {
			var key = headerPair.substring(0, index);
			var val = headerPair.substring(index + 2);
			headers[key] = val;
			}
		}
		return headers;
	}
});

module.exports = HttpResponse;

},{"../../utils/extend":22,"tiny-emitter":25}],16:[function(require,module,exports){
"use strict";

var bind 			= require("../../utils/bind");
var extend			= require("../../utils/extend");
var HttpRequest		= require("./HttpRequest");

/**
 * Tries to emulate the behaviour of node's "http" module, this allows for a common interface when sending http requests
 * both in node and browser. It uses XMLHttpRequest under the hood
 */
var Http = {};

extend(Http, {
	/**
	 * Creates an HttpRequest object
	 * @param {object} options - the request configuration
	 * @param {function} callback - the function to call with the response so it can be handled
	 * @returns {HttpRequest}
	 */
	request: function(options, callback) {
		var request = new HttpRequest(options);
		if(typeof callback === "function") {
			request.on("done", callback);
		}
		return request;
	}
});

module.exports = Http;

},{"../../utils/bind":20,"../../utils/extend":22,"./HttpRequest":14}],17:[function(require,module,exports){
"use strict";

/**
 * Tries to emulate the minimum needed functionality of node's "url" module
 */
var Url = {
	/**
	 * Breaks down a url string into an object containg all its pieces
	 * @param {string} url
	 * @returns {object}
	 */
	parse: function(url) {
		var parsed = {};
		if(typeof url === "string") {
			var parser = document.createElement('a');
			parser.href = url;

			parsed.href = url;
			parsed.protocol = parser.protocol;
			parsed.hostname = parser.hostname;
			parsed.port = parser.port;
			parsed.pathname = parser.pathname;
			parsed.search = parser.search;
			parsed.hash = parser.hash;
		}

		return parsed;
	}
};


module.exports = Url;

},{}],18:[function(require,module,exports){
"use strict";

module.exports = {

	/**
	 * Serializes an XML object into a string using browser specific objects
	 * @param {object} xml - the xml object to serialize
	 * @returns {string} - serialized xml
	 */
	serialize: function(xml) {
		var result;
		if(xml) {
			try {
				var serializer = new XMLSerializer();
				result = serializer.serializeToString(xml);
			} catch(e) {
				result = xml;
			}
		}
		return result;
	},

	/**
	 * Converts a string of xml into an XML object
	 * @param {string} xmlstring
	 * @returns {object} - the xml object
	 */
	parse: function(xmlstring) {
		var result;
		if(typeof xmlstring === "string") {
			try {
				var parser = new DOMParser();
				result = parser.parseFromString(xmlstring, "application/xml");
			} catch(e) {
				result = xmlstring;
			}
		}
		return result;
	}

};

},{}],19:[function(require,module,exports){
"use strict";

/**
 * Interval function that fixes some shortcommings of the standard setInterval function
 * @param {function} func - the function to run on each iteration of the interval
 * @param {number} wait - the interval wait time in milliseconds
 * @param {number} times - the amount of repetitions
 * @param {boolean} immediate - should the function run immediately or be run after a wait
 */
function Interval(func, wait, times, immediate) {
    this.timeout = null;
    this.canceled = false;
    var self = this;

    var interv = function(w, t){
        return function(){
            if(typeof t === "undefined" || t-- > 0){
                try{
                    func.call(null);
                }
                catch(e){
                    t = 0;
                    throw e.toString();
                }
                if(!self.canceled) {
                    self.timeout = setTimeout(interv, w);
                }
            }
        };
    }(wait, times);

    this.cancel = function() {
        this.canceled = true;
        clearTimeout(this.timeout);
    };

    this.timeout = setTimeout(interv, wait);

    if(!!immediate) {
        interv();
    } else {
        this.timeout = setTimeout(interv, wait);
    }


}

module.exports = Interval;

},{}],20:[function(require,module,exports){
"use strict";

/**
 * Binds a function to a context
 * @param {object} context
 * @param {function} fn
 * @returns {function} - the bound function
 */
module.exports = function bind(context, fn) {
	if(context && fn && typeof fn === "function") {
		return function() {
			return fn.apply(context, arguments);
		};
	}
};

},{}],21:[function(require,module,exports){
"use strict";

/**
 * Returns a shallow copy of an object/Array
 * @param {any} src - the object to copy
 * @returns {any} - the copy
 */
module.exports = function copy(src) {
	var copied;
	if(src instanceof Array) {
		copied = src.slice(0, src.length);
	} else if(typeof src === "object") {
		copied = {};
		for(var key in src) {
			if(src.hasOwnProperty(key)) {
				copied[key] = src[key];
			}
		}
	} else {
		copied = src;
	}
	return copied;
};

},{}],22:[function(require,module,exports){
"use strict";

var toArray = require("./toArray");

/**
 * Extends an object with the key/value pairs of other objects
 * It accepts any number of objects to extend the destination with
 * @param {object} destination - the first argument passed is the object that will be extended
 * @param {object} sources... - one or many object arguments passed to extend the destination with
 * @returns {object} - the extended object
 */
module.exports = function extend() {
	var args = toArray(arguments), dest = args[0], src;
	if(typeof dest === "object" || typeof dest === "function") {
		for(var i=1; i<args.length; i++) {
			src = args[i];
			if(typeof src === "object") {
				for(var key in src) {
					if(src.hasOwnProperty(key)) {
						dest[key] = src[key];
					}
				}
			}
		}
	}

	return dest;
};

},{"./toArray":23}],23:[function(require,module,exports){
"use strict";

/**
 * Coverts arguments to array
 * @param {arguments} arr - the arguments to convert to array
 * @returns {Array}
 */
module.exports = function toArray(arr) {
	return Array.prototype.slice.call(arr);
};

},{}],24:[function(require,module,exports){
(function (global){
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition();
	if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
	else if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
	/*jshint validthis:true */
	"use strict";

	var builtInProp, cycle, scheduling_queue,
		ToString = Object.prototype.toString,
		timer = (typeof setImmediate != "undefined") ?
			function timer(fn) { return setImmediate(fn); } :
			setTimeout
	;

	// dammit, IE8.
	try {
		Object.defineProperty({},"x",{});
		builtInProp = function builtInProp(obj,name,val,config) {
			return Object.defineProperty(obj,name,{
				value: val,
				writable: true,
				configurable: config !== false
			});
		};
	}
	catch (err) {
		builtInProp = function builtInProp(obj,name,val) {
			obj[name] = val;
			return obj;
		};
	}

	// Note: using a queue instead of array for efficiency
	scheduling_queue = (function Queue() {
		var first, last, item;

		function Item(fn,self) {
			this.fn = fn;
			this.self = self;
			this.next = void 0;
		}

		return {
			add: function add(fn,self) {
				item = new Item(fn,self);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = void 0;
			},
			drain: function drain() {
				var f = first;
				first = last = cycle = void 0;

				while (f) {
					f.fn.call(f.self);
					f = f.next;
				}
			}
		};
	})();

	function schedule(fn,self) {
		scheduling_queue.add(fn,self);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	// promise duck typing
	function isThenable(o) {
		var _then, o_type = typeof o;

		if (o != null &&
			(
				o_type == "object" || o_type == "function"
			)
		) {
			_then = o.then;
		}
		return typeof _then == "function" ? _then : false;
	}

	function notify() {
		for (var i=0; i<this.chain.length; i++) {
			notifyIsolated(
				this,
				(this.state === 1) ? this.chain[i].success : this.chain[i].failure,
				this.chain[i]
			);
		}
		this.chain.length = 0;
	}

	// NOTE: This is a separate function to isolate
	// the `try..catch` so that other code can be
	// optimized better
	function notifyIsolated(self,cb,chain) {
		var ret, _then;
		try {
			if (cb === false) {
				chain.reject(self.msg);
			}
			else {
				if (cb === true) {
					ret = self.msg;
				}
				else {
					ret = cb.call(void 0,self.msg);
				}

				if (ret === chain.promise) {
					chain.reject(TypeError("Promise-chain cycle"));
				}
				else if (_then = isThenable(ret)) {
					_then.call(ret,chain.resolve,chain.reject);
				}
				else {
					chain.resolve(ret);
				}
			}
		}
		catch (err) {
			chain.reject(err);
		}
	}

	function resolve(msg) {
		var _then, self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		try {
			if (_then = isThenable(msg)) {
				schedule(function(){
					var def_wrapper = new MakeDefWrapper(self);
					try {
						_then.call(msg,
							function $resolve$(){ resolve.apply(def_wrapper,arguments); },
							function $reject$(){ reject.apply(def_wrapper,arguments); }
						);
					}
					catch (err) {
						reject.call(def_wrapper,err);
					}
				})
			}
			else {
				self.msg = msg;
				self.state = 1;
				if (self.chain.length > 0) {
					schedule(notify,self);
				}
			}
		}
		catch (err) {
			reject.call(new MakeDefWrapper(self),err);
		}
	}

	function reject(msg) {
		var self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		self.msg = msg;
		self.state = 2;
		if (self.chain.length > 0) {
			schedule(notify,self);
		}
	}

	function iteratePromises(Constructor,arr,resolver,rejecter) {
		for (var idx=0; idx<arr.length; idx++) {
			(function IIFE(idx){
				Constructor.resolve(arr[idx])
				.then(
					function $resolver$(msg){
						resolver(idx,msg);
					},
					rejecter
				);
			})(idx);
		}
	}

	function MakeDefWrapper(self) {
		this.def = self;
		this.triggered = false;
	}

	function MakeDef(self) {
		this.promise = self;
		this.state = 0;
		this.triggered = false;
		this.chain = [];
		this.msg = void 0;
	}

	function Promise(executor) {
		if (typeof executor != "function") {
			throw TypeError("Not a function");
		}

		if (this.__NPO__ !== 0) {
			throw TypeError("Not a promise");
		}

		// instance shadowing the inherited "brand"
		// to signal an already "initialized" promise
		this.__NPO__ = 1;

		var def = new MakeDef(this);

		this["then"] = function then(success,failure) {
			var o = {
				success: typeof success == "function" ? success : true,
				failure: typeof failure == "function" ? failure : false
			};
			// Note: `then(..)` itself can be borrowed to be used against
			// a different promise constructor for making the chained promise,
			// by substituting a different `this` binding.
			o.promise = new this.constructor(function extractChain(resolve,reject) {
				if (typeof resolve != "function" || typeof reject != "function") {
					throw TypeError("Not a function");
				}

				o.resolve = resolve;
				o.reject = reject;
			});
			def.chain.push(o);

			if (def.state !== 0) {
				schedule(notify,def);
			}

			return o.promise;
		};
		this["catch"] = function $catch$(failure) {
			return this.then(void 0,failure);
		};

		try {
			executor.call(
				void 0,
				function publicResolve(msg){
					resolve.call(def,msg);
				},
				function publicReject(msg) {
					reject.call(def,msg);
				}
			);
		}
		catch (err) {
			reject.call(def,err);
		}
	}

	var PromisePrototype = builtInProp({},"constructor",Promise,
		/*configurable=*/false
	);

	// Note: Android 4 cannot use `Object.defineProperty(..)` here
	Promise.prototype = PromisePrototype;

	// built-in "brand" to signal an "uninitialized" promise
	builtInProp(PromisePrototype,"__NPO__",0,
		/*configurable=*/false
	);

	builtInProp(Promise,"resolve",function Promise$resolve(msg) {
		var Constructor = this;

		// spec mandated checks
		// note: best "isPromise" check that's practical for now
		if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
			return msg;
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			resolve(msg);
		});
	});

	builtInProp(Promise,"reject",function Promise$reject(msg) {
		return new this(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			reject(msg);
		});
	});

	builtInProp(Promise,"all",function Promise$all(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}
		if (arr.length === 0) {
			return Constructor.resolve([]);
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			var len = arr.length, msgs = Array(len), count = 0;

			iteratePromises(Constructor,arr,function resolver(idx,msg) {
				msgs[idx] = msg;
				if (++count === len) {
					resolve(msgs);
				}
			},reject);
		});
	});

	builtInProp(Promise,"race",function Promise$race(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			iteratePromises(Constructor,arr,function resolver(idx,msg){
				resolve(msg);
			},reject);
		});
	});

	return Promise;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],25:[function(require,module,exports){
function E () {
	// Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
	on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;

},{}]},{},[1]);
