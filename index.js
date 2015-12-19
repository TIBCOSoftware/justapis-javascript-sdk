"use strict";

var APGateway = require('./lib/gateway/APGateway');

if(typeof window !== "undefined") {
	window.APGateway = APGateway;
}

module.exports = APGateway;