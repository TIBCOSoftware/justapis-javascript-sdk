"use strict";

module.exports = {
	toJson: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},
	fromJson: function(json) {
		return (json) ? JSON.parse(json) : undefined;
	}
};