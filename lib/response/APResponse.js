"use strict";

var extend	= require("../utils/extend");

function APResponse(xhr, options) {
	var opts = options || {};
	
	this.statusCode = xhr.status;
	this.text = xhr.statusText;
	this.contentType = opts.dataType || "json";
	
	this.headers = this.parseHeaders(xhr.getAllResponseHeaders());
	
	if(xhr.responseText !== "") {
		this.data = xhr.responseText;
	} else if(xhr.responseXml !== "") {
		this.data = xhr.responseXml;
	}
}

APResponse.defaults = {
	statusCode: 0,
	text: "undefined",
	data: {},
};


extend(APResponse.prototype, {
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

module.exports = APResponse;