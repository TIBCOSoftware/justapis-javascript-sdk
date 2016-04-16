"use strict";

/**
 * Binds a function to a context
 * @param {object} context
 * @param {function} fn
 * @returns {function} - the bound function
 */
module.exports = function bind(context, fn) {
	if(context && fn && typeof fn === "function") {
		return function() {
			return fn.apply(context, arguments);
		};
	}
};
