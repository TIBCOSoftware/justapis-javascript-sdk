"use strict";

var toArray = require("./to-array");

/**
 * Extends an object with the key/value pairs of other objects
 * It accepts any number of objects to extend the destination with
 * @param {object} destination - the first argument passed is the object that will be extended
 * @param {object} sources... - one or many object arguments passed to extend the destination with
 * @returns {object} - the extended object
 */
module.exports = function extend() {
	var args = toArray(arguments), dest = args[0], src;
	if(typeof dest === "object" || typeof dest === "function") {
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
