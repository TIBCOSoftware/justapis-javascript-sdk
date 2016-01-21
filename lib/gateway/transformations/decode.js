"use strict";

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