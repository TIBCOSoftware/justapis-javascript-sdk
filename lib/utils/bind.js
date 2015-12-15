"use strict";

module.exports = function bind(context, fn) {
	if(context && fn && typeof fn === "function") {
		return function() {
			return fn.apply(context, arguments);
		};
	}
};