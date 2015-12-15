"use strict";

var APGateway = require('./lib/gateway/APGateway');

if(window) {
	window.APGateway = APGateway;
}