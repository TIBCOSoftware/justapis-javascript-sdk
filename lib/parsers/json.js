"use strict";

module.exports = {
	serialize: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},
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