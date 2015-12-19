"use strict";

var Es6Promise	= require("native-promise-only");
var http			= require("http");

var extend			= require("../utils/extend");
var copy			= require("../utils/copy");
var bind 			= require("../utils/bind");
var APResponse		= require("../response/APResponse");


function APRequest(options) {
	options = options || {};
	extend(this, options);
}


/**
 * Methods
 */
extend(APRequest.prototype, {	
	send: function() {
		var path = (this.url.pathname) ? this.url.pathname : "";
		path += (this.url.search) ? this.url.search : "";
		path += (this.url.hash) ? this.url.hash : "";
		
		var headers = copy(this.headers);
		if(typeof this.contentType === "string") {
			headers["Content-Type"] = this.contentType;
		}
		
		var self = this;
		return new Es6Promise(function(resolve, reject) {
			var req = http.request({
				protocol: self.url.protocol,
				hostname: self.url.hostname,
				port: self.url.port,
				path: path,
				method: self.method,
				headers: self.headers
			}, function(res) {
				var data = "";
				res.on("data", function(chunk) {
					data += chunk;
				});
				
				res.on("end", function() {
					// Create APResponse and finish
					var apResponse = new APResponse(res, self.dataType, data);
					apResponse.parsers = self.parsers;
					resolve(apResponse);
				});
			});
			
			req.on("error", function(e) {
				reject(e);
			});
			
			if(self.method !== "GET") {
				req.write(self.data);
			}
			
			req.end();
		});
	}
});

module.exports = APRequest;