"use strict";

function encode(request) {
	if(request.method !== "GET") {
		switch(request.contentType) {
			case "application/x-www-form-urlencoded; charset=UTF-8":
				request.data = request.parsers.form.toFormData(request.data);
				break;
			case "application/xml":
				// Coming soon..
				break;
			case "application/json":
				request.data = request.parsers.json.toJson(request.data);
				break;
		}
	} else {
		var paramArray = [], params = "";
		if(typeof request.data === "object") {
			for(var key in request.data) {
				if(request.data.hasOwnProperty(key)) {
					paramArray.push(key+"="+request.data[key]); 
				}
			}
			params = paramArray.join("&");
		}
		if(params !== "") {
			params = "?"+params;
		}
		request.url += params;
	}
	return request;	
}


module.exports = encode;