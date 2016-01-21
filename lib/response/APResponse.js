"use strict";

var extend	= require("../utils/extend");

function APResponse(response, dataType, data, cache) {
	extend(
		this,
		APResponse.defaults,
		response,
		{ data: data, contentType: dataType, cache: cache }
	);
}

APResponse.defaults = {
	statusCode: 0,
	statusMessage: "",
	data: {},
	headers: {},
    cache: false
};

module.exports = APResponse;