"use strict";

module.exports = {
	toJson: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},
	fromJson: function(json) {
		var parsed;
		try {
			parsed = (json) ? JSON.parse(json) : undefined;
		} catch(e) {
			parsed = undefined;
		}
		return parsed;
	}
};