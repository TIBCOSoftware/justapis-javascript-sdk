"use strict";

module.exports = function toArray(arr) {
	return Array.prototype.slice.call(arr);
};