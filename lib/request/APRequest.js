"use strict";

var Promise 	= require("native-promise-only");
var bind 		= require("../utils/bind");
var extend		= require("../utils/extend");
var APResponse	= require("../response/APResponse");

function Request(options) {
	this.detectEnv();
	options = options || {};
	extend(this, options);
}

/**
 * Static
 */
Request.states = {
	'UNSENT'			: 0,
	'OPENED'			: 1,
	'HEADERS_RECEIVED'	: 2,
	'LOADING'			: 3,
	'DONE'				: 4 
};

Request.env = {
	modern	: 0,
	ie8		: 1,
	ie6		: 2
};


/**
 * Methods
 */
extend(Request.prototype, {
	
	detectEnv: function() {
		if(typeof XMLHttpRequest !== "undefined") {
			this.env = Request.env.modern;
		} else if(typeof XDomainRequest !== "undefined") {
			this.env = Request.env.ie8;
		} else if(typeof ActiveXObject !== "undefined") {
			this.env = Request.env.ie6;
		}
	},
	
	addOnChangeListener: function(xhr, fn) {
		switch(this.env) {
			case Request.env.modern:
			case Request.env.ie6:
				xhr.onreadystatechange = fn;
				break;
			case Request.env.ie8:
				xhr.onload = fn;
				break;
		}
	},
	
	send: function() {
		var xhr;
		switch(this.env) {
			case Request.env.modern:
				xhr = new window.XMLHttpRequest();
				break;
			case Request.env.ie8:
				xhr = new window.XDomainRequest();
				break;
			case Request.env.ie6:
				xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
				break;
		}
		console.log("Sending request to url: "+this.url);
		xhr.open(this.method, this.url, this.async);
		xhr.setRequestHeader("Content-Type", this.contentType);
		
		for(var key in this.headers) {
			if(this.headers.hasOwnProperty(key)) {
				xhr.setRequestHeader(key, this.headers[key]);
			}
		}
		
		return new Promise(bind(this, function(resolve, reject) {
			this.addOnChangeListener(xhr, function() {
				if(xhr.readyState === Request.states.DONE) {
					var response = new APResponse(xhr, this);
					if(response.statusCode >= 200 && response.statusCode < 400) {
						resolve(response);
					} else {
						reject(new Error("APRequest -> Server responded with "+response.statusCode+": "+response.text));
					}
				}
			});
			
			xhr.ontimeout = function() {
				var response = new APResponse(xhr, this);
				reject(new Error("APRequest -> Request timeout - "+response.statusCode+" "+response.text));
			};
			
			xhr.send(this.data);
			console.dir(xhr);
		}));	
	}
});

module.exports = Request;