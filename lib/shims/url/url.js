"use strict";

var Url = {
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