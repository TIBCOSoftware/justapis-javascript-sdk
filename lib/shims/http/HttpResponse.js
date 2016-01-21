"use strict";

var extend		= require("../../utils/extend");
var EventEmitter = require("tiny-emitter");

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