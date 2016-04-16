"use strict";

var serializer = require("xmlserializer");
var parser = require("xml2js");

module.exports = {

	/**
	 * Serializes an xml object into a string
	 * @param {object} xml
	 * @returns {string}
	 */
	serialize: function(xml) {
		return (xml) ? serializer.serializeToString(xml) : undefined;
	},

	/**
	 * Converts a string of xml data into an xml object
	 * @param {string} xmlstring
	 * @returns {object}
	 */
	parse: function(xmlstring) {
		var xml;
		// By default xml2js should parse synchronously
		parser.parseString(xmlstring, function(err, result) {
			if(!err) {
				xml = result;
			}
		});
		return xml;
	}

};
