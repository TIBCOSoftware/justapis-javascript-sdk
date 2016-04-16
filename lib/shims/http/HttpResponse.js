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
