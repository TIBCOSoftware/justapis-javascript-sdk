"use strict";

/**
 * Decodes a response's data from XML or JSON into an object, based on the content type of the response (which is the data type of the request that originated it)
 * @param {APResponse}
 * @returns {APResponse}
 */
function decode(response) {
	if(typeof response.parsers === "object") {
		switch(response.contentType) {
			case "xml":
				response.data = response.parsers.xml.parse(response.data);
				break;
			case "json":
				response.data = response.parsers.json.parse(response.data);
				break;
		}
	}
	return response;
}

module.exports = decode;
