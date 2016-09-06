"use strict";

var Gateway = require('./lib/gateway/gateway');

if(typeof window !== 'undefined') {
	window.Gateway = Gateway;
}

module.exports = Gateway;
