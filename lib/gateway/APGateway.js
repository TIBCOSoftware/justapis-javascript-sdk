"use strict";

var Url						= require("url");
var APRequest 				= require("../request/APRequest");
var bind					= require("../utils/bind");
var extend					= require("../utils/extend");
var copy					= require("../utils/copy");
var JSONParser				= require("../parsers/json");
var FormDataParser			= require("../parsers/formData");
var EncodeTransformation	= require("./transformations/encode");
var DecodeTransformation	= require("./transformations/decode");


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
APGateway.defaults = {
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
	dataType: "json",
	contentType: "application/x-www-form-urlencoded; charset=UTF-8",
	data: {},
	headers: {},
	parsers: {
		json: JSONParser,
		form: FormDataParser,
		xml: undefined
	},
	transformations: {
		request: [ EncodeTransformation ],
		response: [ DecodeTransformation ]
	}
};

APGateway.create = function(options) {
	return new APGateway(options);
};

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
	
	execute: function() {
		var i;
		var reqTrans = this.config.transformations.request, 
			resTrans = this.config.transformations.response, 
			$config = extend({}, this.config), 
			options,
			request,
			promise;
		
		// Remove transformations from the request options so they can't be modified on the fly
		delete $config.transformations;
		options = $config;
		for(i=0; i<reqTrans.length; i++) {
			options = reqTrans[i](options);
		}
		request = new APRequest(options);
		
		promise = request.send();
		for(i=0; i<resTrans.length; i++) {
			promise.then(resTrans[i]);
		}
		
		if(this.silentFail()) {
			promise.catch(function(e) { return; });
		}
		
		return promise;
	},
	
});

module.exports = APGateway;