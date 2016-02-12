"use strict";

var Es6Promise	    = require("native-promise-only");
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

	urlPath: function() {
    var path = (this.url.pathname) ? this.url.pathname : "";
		path += (this.url.search) ? this.url.search : "";
		path += (this.url.hash) ? this.url.hash : "";
    return path;
  },

  fullUrl: function() {
      var url = this.url.protocol + "//" + this.url.hostname;
      if(this.url.port !== null && this.url.port !== undefined && this.url.port !== "") {
          url += ":" + this.url.port;
      }
      url += this.urlPath();
      return url;
  },

	send: function() {
    var path = this.urlPath();

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
				headers: headers,
				withCredentials: self.withCredentials
			}, function(res) {
				var data = "";
				res.on("data", function(chunk) {
					data += chunk;
				});

				res.on("end", function() {
					// Create APResponse and finish
					var apResponse = new APResponse(res, self.dataType, data, self.cache);
					apResponse.parsers = self.parsers;
        	apResponse.origin = { method: self.method, url: self.fullUrl() };
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
