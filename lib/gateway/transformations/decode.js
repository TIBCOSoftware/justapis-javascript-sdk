"use strict";

function decode(response) {
	switch(response.contentType) {
		case "xml":
			// Coming soon...
			break;
		case "json":
			response.data = response.origin.parsers.json.fromJson(response.data);
			break;
	}
	return response;
}

module.exports = decode;