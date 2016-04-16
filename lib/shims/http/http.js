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
