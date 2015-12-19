"use strict";

function decode(response) {
	if(typeof response.parsers === "object") {
		switch(response.contentType) {
			case "xml":
				// Coming soon...
				break;
			case "json":
				response.data = response.parsers.json.parse(response.data);
				break;
		}	
	}
	return response;
}

module.exports = decode;