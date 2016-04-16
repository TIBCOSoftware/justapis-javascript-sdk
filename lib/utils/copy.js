"use strict";

/**
 * Returns a shallow copy of an object/Array
 * @param {any} src - the object to copy
 * @returns {any} - the copy
 */
module.exports = function copy(src) {
	var copied;
	if(src instanceof Array) {
		copied = src.slice(0, src.length);
	} else if(typeof src === "object") {
		copied = {};
		for(var key in src) {
			if(src.hasOwnProperty(key)) {
				copied[key] = src[key];
			}
		}
	} else {
		copied = src;
	}
	return copied;
};
