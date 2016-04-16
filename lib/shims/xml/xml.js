"use strict";

module.exports = {

	/**
	 * Serializes an XML object into a string using browser specific objects
	 * @param {object} xml - the xml object to serialize
	 * @returns {string} - serialized xml
	 */
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

	/**
	 * Converts a string of xml into an XML object
	 * @param {string} xmlstring
	 * @returns {object} - the xml object
	 */
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
