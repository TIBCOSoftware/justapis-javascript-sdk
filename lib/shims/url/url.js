"use strict";

/**
 * Tries to emulate the minimum needed functionality of node's "url" module
 */
var Url = {
	/**
	 * Breaks down a url string into an object containg all its pieces
	 * @param {string} url
	 * @returns {object}
	 */
	parse: function(url) {
		var parsed = {};
		if(typeof url === "string") {
			var parser = document.createElement('a');
			parser.href = url;

			parsed.href = url;
			parsed.protocol = parser.protocol;
			parsed.hostname = parser.hostname;
			parsed.port = parser.port;
			parsed.pathname = parser.pathname;
			parsed.search = parser.search;
			parsed.hash = parser.hash;
		}

		return parsed;
	}
};


module.exports = Url;
