"use strict";

var Request 		= require("../request/APRequest");
var bind			= require("../utils/bind");
var extend			= require("../utils/extend");
var copy			= require("../utils/copy");
var JSONParser		= require("../parsers/json");
var FormDataParser	= require("../parsers/formData");

function APGateway(options) {
	this.config = {};
	extend(this.config, APGateway.defaults);
	extend(this.config, options);
	
	// Add default transformation to encode request data
	this.addRequestTransformation(bind(this, function(request) {
		if(request.method !== "GET") {
			switch(request.contentType) {
				case "application/x-www-form-urlencoded; charset=UTF-8":
					request.data = this.config.parsers.form.toFormData(request.data);
					break;
				case "application/xml":
					// Coming soon..
					break;
				case "application/json":
					request.data = this.config.parsers.json.toJson(request.data);
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
				params = paramArray.join("&");
			}
			if(params !== "") {
				params = "?"+params;
			}
			request.url += params;
		}
		return request;	
	}));
	
	// Add default transformation to decode response data
	this.addResponseTransformation(bind(this, function(response) {
		switch(response.contentType) {
			case "xml":
				// Coming soon...
				break;
			case "json":
				response.data = this.config.parsers.json.fromJson(response.data);
				break;
		}
		return response;
	}));
}

/**
 * Static
 */
APGateway.defaults = {
	url: "http://localhost:5000",
	method: "GET",
	async: true,
	crossDomain: true,
	dataType: "json",
	contentType: "application/json",
	data: undefined,
	headers: {},
	parsers: {
		json: JSONParser,
		form: FormDataParser,
		xml: undefined
	},
	transformations: {
		request: [],
		response: []
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
				this.config.url = url;
			}
		} else {
			return this.config.url; 
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
	
	crossDomain: function(cors) {
		if(typeof cors === "boolean") {
			this.config.crossDomain = true;
		} else {
			return this.config.crossDomain;
		}
		return this;
	},
	
	copy: function() {
		var gw = new APGateway(this.config);
		gw.headers(copy(this.headers()));
		gw.params(copy(this.params()));
		gw.requestTransformations(copy(this.config.transformations.request));
		gw.responseTransformations(copy(this.config.transformations.response));
		gw.config.parsers = copy(this.config.parsers);
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
		var reqTrans = this.config.transformations.request, $config = extend({}, this.config), options;
		
		// Remove transformations from the request options so they can't be modified on the fly
		delete $config.transformations;
		
		options = $config;
		for(var i=0; i<reqTrans.length; i++) {
			options = reqTrans[i](options);
		}
		var request = new Request(options);
		
		return request.send().then(bind(this, function(response) {
			var res = response, resTrans = this.config.transformations.response;
			for(var i=0; i<resTrans.length; i++) {
				res = resTrans[i](res);
			}
			return res;
		}));
	},
	
});

module.exports = APGateway;