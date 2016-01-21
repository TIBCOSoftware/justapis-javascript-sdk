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
var XMLParser				= require("../parsers/xml");
var FormDataParser			= require("../parsers/formData");
var EncodeTransformation	= require("./transformations/encode");
var DecodeTransformation	= require("./transformations/decode");
var hpkp                    = require("../hpkp/hpkp");


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
    create: function(options) {
        return new APGateway(options);
    },

    RequestCache: new APCache("APRequestCache"),

    Queue: new APQueue(),

    APRequest: APRequest,

    APResponse: APResponse,

    Promise: Es6Promise,

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

	data: function(data) {
		if(data) {
			this.config.data = data;
		} else {
			return this.config.data;
		}
		return this;
	},

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

	silentFail: function(silent) {
		if(typeof silent === "boolean") {
			this.config.silentFail = silent;
		} else {
			return this.config.silentFail;
		}
		return this;
	},

    cache: function(active) {
        if(typeof active === "boolean") {
            this.config.cache = active;
        } else {
            return this.config.cache;
        }
        return this;
    },

	copy: function() {
		var gw = new APGateway(this.config);
		gw.headers(copy(this.headers()));
		gw.data(copy(this.data()));
		gw.config.parsers = copy(this.config.parsers);
		gw.requestTransformations(copy(this.config.transformations.request));
		gw.responseTransformations(copy(this.config.transformations.response));
		return gw;
	},

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

	addRequestTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.request.push(transformation);
		}
		return this;
	},

	addResponseTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.response.push(transformation);
		}
		return this;
	},

    hpkp: function(options) {
        var header = hpkp(options.sha256s, options.maxAge, options.includeSubdomains, options.reportOnly, options.reportUri);
        this.headers(header);
        return this;
    },

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
