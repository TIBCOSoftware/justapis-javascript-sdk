"use strict";

var toArray = require("./toArray");

module.exports = function extend() {
	var args = toArray(arguments), dest = args[0], src;
	if(typeof dest === "object") {
		for(var i=1; i<args.length; i++) {
			src = args[i];
			if(typeof src === "object") {
				for(var key in src) {
					if(src.hasOwnProperty(key)) {
						dest[key] = src[key];
					}
				}
			}
		}
	}
	
	return dest;
};