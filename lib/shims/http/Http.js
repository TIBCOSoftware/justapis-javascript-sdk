"use strict";

var bind 			= require("../../utils/bind");
var extend			= require("../../utils/extend");
var HttpRequest		= require("./HttpRequest");


var Http = {};

extend(Http, {
	request: function(options, callback) {
		var request = new HttpRequest(options);
		if(typeof callback === "function") {
			request.on("done", callback);
		}
		return request;	
	}
});

module.exports = Http;