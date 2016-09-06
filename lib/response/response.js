"use strict";

var extend	= require("../utils/extend");

/**
 * Represents a single response to a request
 * @constructor
 * @param {HttpResponse} response - the actual response from the http module
 * @param {string} dataType - the type of content expected in the response
 * @param {string} data - the full data from the response
 * @param {boolean} cache - whether the response should be cached
 */
function Response(response, dataType, data, cache) {
	extend(
		this,
		Response.defaults,
		response,
		{ data: data, contentType: dataType, cache: cache }
	);
}

Response.defaults = {
	statusCode: 0,
	statusMessage: "",
	data: {},
	headers: {},
  cache: false
};

module.exports = Response;
