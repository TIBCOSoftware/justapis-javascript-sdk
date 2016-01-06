"use strict";

var serializer = require("xmlserializer");
var parser = require("xml2js");

module.exports = {
	
	serialize: function(xml) {
		return (xml) ? serializer.serializeToString(xml) : undefined;
	},
	
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
 