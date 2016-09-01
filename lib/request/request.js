"use strict";

var Es6Promise	    = require("native-promise-only");
// The http module is only used in a node environment, when using with browserify
// it will be replaced with a shim (see package.json "browser" and shims folder)
var http			= require("http");

var extend			= require("../utils/extend");
var copy			= require("../utils/copy");
var bind 			= require("../utils/bind");
var APResponse		= require("../response/response");

/**
 * Represents a single request
 * @constructor
 * @param {object} options - the configuration for the request (see Gateway)
 */
function APRequest(options) {
	options = options || {};
	extend(this, options);
}


/**
 * Methods
 */
extend(APRequest.prototype, {

	/**
	 * Builds a url (without the protocol) from the individual pieces
	 * @method
	 * @returns {string} - the url string
	 */
	urlPath: function() {
    var path = (this.url.pathname) ? this.url.pathname : "";
		path += (this.url.search) ? this.url.search : "";
		path += (this.url.hash) ? this.url.hash : "";
    return path;
  },

	/**
	 * Builds a url (with the protocol), this method is used to append the url to the APResponse before returning it
	 * @method
	 * @returns {string} - the url string
	 */
  fullUrl: function() {
      var url = this.url.protocol + "//" + this.url.hostname;
      if(this.url.port !== null && this.url.port !== undefined && this.url.port !== "") {
          url += ":" + this.url.port;
      }
      url += this.urlPath();
      return url;
  },

	/**
	 * Sends the request using http module
	 * @method
	 * @returns {Promise}
	 */
	send: function() {
    var path = this.urlPath();
		var headers = copy(this.headers);
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
