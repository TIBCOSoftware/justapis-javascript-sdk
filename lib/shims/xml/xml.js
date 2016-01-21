"use strict";

module.exports = {

	serialize: function(xml) {
		var result;
		if(xml) {
			try {
				var serializer = new XMLSerializer();
				result = serializer.serializeToString(xml);
			} catch(e) {
				result = xml;
			}
		}
		return result;
	},

	parse: function(xmlstring) {
		var result;
		if(typeof xmlstring === "string") {
			try {
				var parser = new DOMParser();
				result = parser.parseFromString(xmlstring, "application/xml");
			} catch(e) {
				result = xmlstring;
			}
		}
		return result;
	}

};
