"use strict";

var extend			= require("../../utils/extend");
var copy			= require("../../utils/copy");
var bind			= require("../../utils/bind");
var HttpResponse	= require("./HttpResponse");
var EventEmitter 	= require("tiny-emitter");

function HttpRequest(options) {
	this.url = "";
	this.method = options.method;
	this.headers = copy(options.headers);
	
	if(typeof options === "object") {
		this.url = options.protocol + "//" + options.hostname + ":" + options.port + options.path;
	}
	
	this.detectEnv();
}

HttpRequest.prototype = new EventEmitter();

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
	write: function(data) {
		this.data = data;
	},
	
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
	
	detectEnv: function() {
		if(typeof XMLHttpRequest !== "undefined") {
			this.env = HttpRequest.env.modern;
		} else if(typeof XDomainRequest !== "undefined") {
			this.env = HttpRequest.env.ie8;
		} else if(typeof ActiveXObject !== "undefined") {
			this.env = HttpRequest.env.ie6;
		}
	},
	
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