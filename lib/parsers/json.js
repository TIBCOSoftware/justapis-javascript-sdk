"use strict";

module.exports = {
	/**
	 * Serializes a javascript object as a JSON string
	 * @param {object} data
	 * @returns {string} - encoded data
	 */
	serialize: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},

	/**
	 * Converts a JSON string into a javascript object
	 * @param {string} json
	 * @returns {object}
	 */
	parse: function(json) {
		var parsed;
		try {
			parsed = (json) ? JSON.parse(json) : undefined;
		} catch(e) {
			parsed = undefined;
		}
		return parsed;
	}
};
