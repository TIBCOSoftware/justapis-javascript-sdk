"use strict";

/**
 * Coverts arguments to array
 * @param {arguments} arr - the arguments to convert to array
 * @returns {Array}
 */
module.exports = function toArray(arr) {
	return Array.prototype.slice.call(arr);
};
