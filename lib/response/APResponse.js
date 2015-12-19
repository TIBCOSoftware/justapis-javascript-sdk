"use strict";

var extend	= require("../utils/extend");

function APResponse(response, dataType, data) {
	extend(
		this,
		APResponse.defaults,
		response,
		{ data: data, contentType: dataType }
	);
}

APResponse.defaults = {
	statusCode: 0,
	statusMessage: "",
	data: {},
	headers: {}
};

module.exports = APResponse;