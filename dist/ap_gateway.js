(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var APGateway = require('./lib/gateway/APGateway');

if(typeof window !== "undefined") {
	window.APGateway = APGateway;
}

module.exports = APGateway;
},{"./lib/gateway/APGateway":4}],2:[function(require,module,exports){
"use strict";

var Es6Promise	    = require("native-promise-only");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var defaultStorage  = require("./persistence/APMemoryStorage");

function APCache(prefix) {
    this.prefix = prefix;
    this.storage = APCache.defaults.storage;
    this.ttl = APCache.defaults.ttl;
    this.expirationCheck = APCache.defaults.expirationCheck;
}

APCache.defaults = {
   
   storage: defaultStorage,
   
   ttl: 604800000,
   
   expirationCheck: 600,
   
   set: function(key, value) {
       if(key !== undefined && key !== null && value !== undefined && value !== null) {
           var serialized = this.cacheKey(key);
           var fullValue = { value: value, timestamp: (new Date()).toJSON() };
           return this.storage.set(serialized, fullValue);
       }
       return Es6Promise.resolve(undefined);
   },
   
   get: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.get(serialized).then(bind(this, function(record) {
               var isAlive = this.checkTTL(record);
               return (isAlive) ? record.value : undefined;
           }));
       }
       return Es6Promise.resolve(undefined);
   },
   
   getAll: function() {
       return this.storage.getAll(this.prefix).then(bind(this, function(all) {
           var isAlive = true, pairs = {};
           for(var key in all) {
               if(all.hasOwnProperty(key)) {
                   isAlive = this.checkTTL(all[key]);
                   if(!isAlive) {
                       this.remove(key);
                       delete all[key];
                   } else {
                       pairs[key] = all[key].value;
                   }
               }
           }
           return all;
       }));
   },
   
   remove: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.remove(serialized);
       }
       return Es6Promise.resolve(undefined);
   },
   
   checkTTL: function(record) {
       var isAlive = false, now = new Date(), diff;
       if(record !== undefined && record !== null && record.timestamp) {
           var ts = new Date(record.timestamp);
           diff = Math.abs(ts - now);
           isAlive = diff < this.ttl;
       }
       return isAlive;
   },
   
   cacheKey: function(key) {
       var serialized = "", keyString = "";
       if(key !== undefined && key !== null) {
           if(typeof this.prefix === "string") {
               serialized += this.prefix + "::";
           }
           serialized += (typeof key !== "string") ? JSON.stringify(key) : key;
       }
       return serialized;
   },
   
   flush: function() {
       return this.storage.flush(this.prefix);
   }
};

extend(APCache.prototype, {
   set: APCache.defaults.set,
   get: APCache.defaults.get,
   getAll: APCache.defaults.getAll,
   remove: APCache.defaults.remove,
   checkTTL: APCache.defaults.checkTTL,
   cacheKey: APCache.defaults.cacheKey,
   flush: APCache.defaults.flush,
   
   startCleanupCycle: function() {
       this.cleanupCycle = setInterval(bind(this, function() {
           var isAlive = true;
           this.getAll().then(bind(this, function(allRecords) {
              for(var key in allRecords) {
                  if(allRecords.hasOwnProperty(key)) {
                      isAlive = this.checkTTL(allRecords[key]);
                      if(!isAlive) {
                          this.remove(key);
                      }
                  }
              } 
           }));
       }), this.expirationCheck*1000);
       return this;
   },
   
   stopCleanupCycle: function() {
       if(this.cleanupCycle) {
           clearInterval(this.cleanupCycle);
       }
       return this;
   }
});


module.exports = APCache;
},{"../utils/bind":20,"../utils/extend":22,"./persistence/APMemoryStorage":3,"native-promise-only":24}],3:[function(require,module,exports){
"use strict";

var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

function APBrowserStorage() {
    if(typeof window.localStorage !== "undefined") {
        this.store = window.localStorage;
    } else {
        throw new Error("window.localStorage is required for APBrowserStorage.");
    }
}

extend(APBrowserStorage.prototype, {
    
   keysWithPrefix: function(prefix) {
       var results = [], pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results.push(key);
           }
       }
       return results;
   },
   
   findByPrefix: function(prefix) {
       var results = {}, pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results[key] = JSON.parse(this.store.getItem(key));
           }
       }
       return results;
   },
    
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.setItem(key, JSON.stringify(value));
            resolve();
       }));
   },
   
   get: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            var record = {}, item = JSON.parse(this.store.getItem(key));
            if(item !== null && item !== undefined && typeof item === "object") {
                record.timestamp = item.timestamp;
                record.value = item.value;
            }
            resolve(record);
       }));
   },
   
   getAll: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var result = {};
            if(typeof prefix === "string" && prefix !== "") {
                result = this.findByPrefix(prefix);
            }
            resolve(result);           
       }));
   },
   
   remove: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.removeItem(key);
            resolve(true);
       }));
   },
   
   flush: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var keys = this.keysWithPrefix(prefix);
            for(var i=0 ; i < keys.length ; i++) {
                this.remove(keys[i]);
            }
            resolve(true);
       }));
   }
});

module.exports = new APBrowserStorage();
},{"../../utils/bind":20,"../../utils/extend":22,"native-promise-only":24}],4:[function(require,module,exports){
"use strict";

var Es6Promise	            = require("native-promise-only");
var Url						= require("url");
var APRequest 				= require("../request/APRequest");
var APResponse              = require("../response/APResponse");
var APCache                 = require("../cache/APCache");
var APQueue                 = require("../queue/APQueue");
var bind					= require("../utils/bind");
var extend					= require("../utils/extend");
var copy					= require("../utils/copy");
var JSONParser				= require("../parsers/json");
var XMLParser				= require("../parsers/xml");
var FormDataParser			= require("../parsers/formData");
var EncodeTransformation	= require("./transformations/encode");
var DecodeTransformation	= require("./transformations/decode");
var hpkp                    = require("../hpkp/hpkp");


function APGateway(options) {
	this.config = {};
	
	extend(this.config, APGateway.defaults);
	
	this.config.url = copy(APGateway.defaults.url);
	this.config.data = copy(APGateway.defaults.data);
	this.config.headers = copy(APGateway.defaults.headers);
	this.config.parsers = copy(APGateway.defaults.parsers);
	this.config.transformations = {
		request: copy(APGateway.defaults.transformations.request),
		response: copy(APGateway.defaults.transformations.response)
	};
	
	if(options && typeof options.url === "string") {
		var url = Url.parse(options.url);
		var $config = extend({}, options);
		delete $config.url;
		$config.url = url;
		extend(this.config, $config);
	} else {
		extend(this.config, options);
	}
    
}

/**
 * Static
 */
extend(APGateway, {
    create: function(options) {
        return new APGateway(options);
    },
    
    RequestCache: new APCache("APRequestCache"),
    
    Queue: new APQueue(),
    
    APRequest: APRequest,
    
    APResponse: APResponse,
    
    Promise: Es6Promise, 
    
    defaults: {
        url: {
            href: "http://localhost:5000",
            protocol: "http:",			
            hostname: "localhost",
            port: "5000",
            pathname: "/",
            search: null,
            hash: null
        },
        method: "GET",
        silentFail: true,
        cache: true,
        dataType: "json",
        contentType: "application/x-www-form-urlencoded; charset=UTF-8",
        data: {},
        headers: {},
        parsers: {
            json: JSONParser,
            form: FormDataParser,
            xml: XMLParser
        },
        transformations: {
            request: [ EncodeTransformation ],
            response: [
                DecodeTransformation,
                // Cache response
                function(response) {
                    if(response.cache && response.origin.method === "GET") {
                        APGateway.RequestCache.set(response.origin.url, response);
                    }
                    return response;
                }
            ]
        }
    }
});

/**
 * Methods
 */
extend(APGateway.prototype, {
	
	url: function(url) {
		if(url) {
			if(typeof url === "string") {
				var $url = Url.parse(url);
				this.config.url = $url;
			}
		} else {
			return this.config.url.href; 
		}
		return this;
	},
	
	method: function(method) {
		if(method) {
			if(typeof method === "string") {
				this.config.method = method;
			}
		} else {
			return this.config.method;
		}
		return this;
	},
	
	data: function(data) {
		if(data) {
			this.config.data = data;
		} else {
			return this.config.data;
		}
		return this;
	},
    
    dataType: function(dataType) {
        if(dataType) {
			if(typeof dataType === "string") {
				this.config.dataType = dataType;
			}
		} else {
			return this.config.dataType;
		}
		return this;
    },
	
	contentType: function(contentType) {
		if(contentType) {
			if(typeof contentType === "string") {
				this.config.contentType = contentType;
			}
		} else {
			return this.config.contentType;
		}
		return this;
	},
	
	headers: function(headers) {
		if(headers) {
			if(typeof headers === "object") {
				extend(this.config.headers, headers);
			}
		} else {
			return this.config.headers;
		}
		return this;
	},
	
	silentFail: function(silent) {
		if(typeof silent === "boolean") {
			this.config.silentFail = silent;
		} else {
			return this.config.silentFail;
		}
		return this;
	},
    
    cache: function(active) {
        if(typeof active === "boolean") {
            this.config.cache = active;
        } else {
            return this.config.cache;
        }
        return this;
    },
	
	copy: function() {
		var gw = new APGateway(this.config);
		gw.headers(copy(this.headers()));
		gw.data(copy(this.data()));
		gw.config.parsers = copy(this.config.parsers);
		gw.requestTransformations(copy(this.config.transformations.request));
		gw.responseTransformations(copy(this.config.transformations.response));
		return gw;
	},
	
	requestTransformations: function(transformations) {
		if(transformations) {
			if(transformations instanceof Array) {
				this.config.transformations.request = transformations;
			}
		} else {
			return this.config.transformations.request;
		}
		return this;
	},
	
	responseTransformations: function(transformations) {
		if(transformations) {
			if(transformations instanceof Array) {
				this.config.transformations.response = transformations;
			}
		} else {
			return this.config.transformations.response;
		}
		return this;
	},
	
	addRequestTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.request.push(transformation);
		}
		return this;
	},
	
	addResponseTransformation: function(transformation) {
		if(transformation && typeof transformation === "function") {
			this.config.transformations.response.push(transformation);
		}
		return this;
	},
    
    hpkp: function(options) {
        var header = hpkp(options.sha256s, options.maxAge, options.includeSubdomains, options.reportOnly, options.reportUri);
        this.headers(header);
        return this;
    },
	
	execute: function() {
		var i;
		var reqTrans = this.config.transformations.request, 
			options,
			request,
            requestKey,
			$config = extend({}, this.config, {
				url: copy(this.config.url), 
				headers: copy(this.config.headers),
				parsers: copy(this.config.parsers)
			}); 
		
		// Remove transformations from the request options so they can't be modified on the fly
		delete $config.transformations;
		options = $config;
		for(i=0; i<reqTrans.length; i++) {
			options = reqTrans[i](options);
		}
		request = new APRequest(options);
		
        requestKey = request.fullUrl();
        
        if(this.config.cache && request.method === "GET") {
            return APGateway.RequestCache.get(requestKey).then(bind(this, function(value) {
                if(value !== undefined) {
                    var res = new APResponse();
                    extend(res, value);
                    return res;
                } else {
                    return this.sendRequest(request);
                }
            }));
        } else {
            return this.sendRequest(request);
        }
	},
    
    sendRequest: function(request) {
        var self = this;
        return new Es6Promise(function(resolve, reject) {
            APGateway.Queue.queue(request, function(req) {
                var responseTransformations = self.responseTransformations();
                var promise = req.send();
                for(var i=0; i<responseTransformations.length; i++) {
                    promise.then(responseTransformations[i]);
                }
                if(self.silentFail()) {
                    promise.catch(function(e) { return; });
                }
                resolve(promise);
            });
        });
    }
});

module.exports = APGateway;
},{"../cache/APCache":2,"../hpkp/hpkp":7,"../parsers/formData":8,"../parsers/json":9,"../parsers/xml":18,"../queue/APQueue":10,"../request/APRequest":12,"../response/APResponse":13,"../utils/bind":20,"../utils/copy":21,"../utils/extend":22,"./transformations/decode":5,"./transformations/encode":6,"native-promise-only":24,"url":17}],5:[function(require,module,exports){
"use strict";

function decode(response) {
	if(typeof response.parsers === "object") {
		switch(response.contentType) {
			case "xml":
				response.data = response.parsers.xml.parse(response.data);
				break;
			case "json":
				response.data = response.parsers.json.parse(response.data);
				break;
		}	
	}
	return response;
}

module.exports = decode;
},{}],6:[function(require,module,exports){
"use strict";

function encode(request) {
	if(request.method !== "GET") {
		switch(request.contentType) {
			case "application/x-www-form-urlencoded; charset=UTF-8":
				request.data = request.parsers.form.serialize(request.data);
				break;
			case "application/xml":
				request.data = request.parsers.xml.serialize(request.data);
				break;
			case "application/json":
				request.data = request.parsers.json.serialize(request.data);
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
			params = paramArray.sort().join("&");
		}
		if(params !== "") {
			params = "?"+params;
		} else {
			params = null;
		}
		request.url.search = params;
	}
	return request;	
}


module.exports = encode;
},{}],7:[function(require,module,exports){
"use strict";

function validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(!sha256s ||  !(sha256s instanceof Array) || sha256s.length < 2) {
        return false;
    }
    if(!maxAge) {
        return false;
    }
    if(!!reportOnly && (!reportUri || typeof reportUri !== "string" || reportUri === "")) {
        return false;
    }
    return true;
}

function headerName(reportOnly) {
    var name = "Public-Key-Pins";
    if(reportOnly) {
        name += "-Report-Only";
    }
    return name;
}

function headerValue(sha256s, maxAge, includeSubdomains, reportUri) {
    var values = [];
    for(var i=0 ; i < sha256s.length ; i++) {
        values.push('pin-sha256="' + sha256s[i] + '"');
    }
    
    values.push('max-age=' + Math.round(maxAge));
    
    if(!!includeSubdomains) {
        values.push('includeSubdomains');
    }
    
    if(reportUri) {
        values.push('report-uri="' + reportUri + '"');
    }
    
    return values.join('; ');
}

module.exports = function hpkp(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri)) {
        var headerName = headerName(reportOnly);
        var headerValue = headerValue(sha256s, maxAge, includeSubdomains, reportUri);
        var header = {};
        header[headerName] = headerValue;
        return header;
    }
    return {};
};
},{}],8:[function(require,module,exports){
"use strict";

function encodeToFormData(data) {
	var urlEncodedData = "", urlEncodedDataPairs = [];
	
	if(data) {
		if(typeof data === "object") {
			// We turn the data object into an array of URL encoded key value pairs.
			for(var name in data) {
				urlEncodedDataPairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
			}	
			// We combine the pairs into a single string and replace all encoded spaces to 
			// the plus character to match the behaviour of the web browser form submit.
			urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');
		}
	}	
	return urlEncodedData;
}

module.exports = {
	serialize: function(data) {
		return encodeToFormData(data);
	},
	parse: function(data) {
		// Void function to adhere to common parser interface
		return data;
	}
};
},{}],9:[function(require,module,exports){
"use strict";

module.exports = {
	serialize: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},
	parse: function(json) {
		var parsed;
		try {
			parsed = (json) ? JSON.parse(json) : undefined;
		} catch(e) {
			parsed = undefined;
		}
		return parsed;
	}
};
},{}],10:[function(require,module,exports){
"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var Interval        = require("../utils/Interval");
var APQueueMessage  = require("./APQueueMessage");

function APQueue() {
    this.active = true;
    this.messages = [];
    this.dequeueLoop = null;
    this.throttleDequeueBy = 300;
}

extend(APQueue.prototype, {
    
    queue: function(element, fn) {
        var message = new APQueueMessage(element);
        if(typeof fn === "function") {
            message.on("dispatch", fn);
        }
        
        this.messages.push(message);
        
        if(this.active && this.messages.length === 1) {
            this.dequeue();
        }
        
        return message;
    },
    
    dequeue: function() {
        if(this.dequeueLoop === null) {
            this.dequeueLoop = new Interval(bind(this, function() {
                if(this.active && this.messages.length > 0) {
                    var message = this.messages.shift();
                    message.emit("dispatch", message.content);
                } else {
                    this.dequeueLoop.cancel();
                    this.dequeueLoop = null;
                }
            }), this.throttleDequeueBy, undefined, true);
        }
        return this;
    },
    
    pause: function() {
        this.active = false;
        return this;
    },
    
    resume: function() {
        this.active = true;
        this.dequeue();
        return this;
    },
    
    throttleBy: function(milliseconds) {
        if(typeof milliseconds === "number") {
            this.throttleDequeueBy = milliseconds;
        }
        return this;
    },
    
    export: function() {
        if(!this.active) {
            var len = this.messages.length;
            var messages = [];
            for(var i=0; i<len; i++) {
                messages.push(this.messages[i].content);
            }
        } else {
            throw new Error("APQueue must be paused to exportable");
        }
    }
    
});

module.exports = APQueue;


},{"../utils/Interval":19,"../utils/bind":20,"../utils/extend":22,"./APQueueMessage":11,"tiny-emitter":25}],11:[function(require,module,exports){
"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");

function APQueueMessage(content) {
    this.content = content;
}

APQueueMessage.prototype = new EventEmitter();
APQueueMessage.prototype.constructor = APQueueMessage;

module.exports = APQueueMessage;
},{"../utils/extend":22,"tiny-emitter":25}],12:[function(require,module,exports){
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
				headers: headers
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
},{"../response/APResponse":13,"../utils/bind":20,"../utils/copy":21,"../utils/extend":22,"http":16,"native-promise-only":24}],13:[function(require,module,exports){
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
},{"../utils/extend":22}],14:[function(require,module,exports){
"use strict";

var extend			= require("../../utils/extend");
var copy			= require("../../utils/copy");
var bind			= require("../../utils/bind");
var HttpResponse	= require("./HttpResponse");
var EventEmitter 	= require("tiny-emitter");

function HttpRequest(options) {
	this.url = "";
	this.method = options.method;
	this.headers = copy(options.headers);
	
	if(typeof options === "object") {
		this.url = options.protocol + "//" + options.hostname + ":" + options.port + options.path;
	}
	
	this.detectEnv();
}

HttpRequest.prototype = new EventEmitter();
HttpRequest.prototype.constructor = HttpRequest;

/**
 * Static
 */
HttpRequest.states = {
	'UNSENT'			: 0,
	'OPENED'			: 1,
	'HEADERS_RECEIVED'	: 2,
	'LOADING'			: 3,
	'DONE'				: 4 
};

HttpRequest.env = {
	modern	: 0,
	ie8		: 1,
	ie6		: 2
};

extend(HttpRequest.prototype, {
	write: function(data) {
		this.data = data;
	},
	
	end: function() {
		var xhr;
		
		switch(this.env) {
			case HttpRequest.env.modern:
				xhr = new window.XMLHttpRequest();
				break;
			case HttpRequest.env.ie8:
				xhr = new window.XDomainRequest();
				break;
			case HttpRequest.env.ie6:
				xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
				break;
		}
		
		xhr.open(this.method, this.url, true);
        
		if(typeof this.headers === "object") {
			for(var key in this.headers) {
				if(this.headers.hasOwnProperty(key)) {
					xhr.setRequestHeader(key, this.headers[key]);
				}
			}
		}
		
		this.addOnChangeListener(xhr, bind(this, function() {
			if(xhr.readyState === HttpRequest.states.DONE) {
				var response = new HttpResponse(xhr);
				if(xhr.status >= 200 && xhr.status < 400) {
					this.emit("done", response);
					response.emit("data", response.data);
					response.emit("end");
				} else {
					this.emit("error", new Error("Request failed -> "+response.statusCode+", "+response.text));
				}
			}
		}));
		
		xhr.ontimeout = bind(this, function() {
			var response = new HttpResponse(xhr);
			this.emit("error", new Error("Request timeout -> "+response.statusCode+", "+response.text));
		});
		
		xhr.send(this.data);
	},
	
	detectEnv: function() {
		if(typeof XMLHttpRequest !== "undefined") {
			this.env = HttpRequest.env.modern;
		} else if(typeof XDomainRequest !== "undefined") {
			this.env = HttpRequest.env.ie8;
		} else if(typeof ActiveXObject !== "undefined") {
			this.env = HttpRequest.env.ie6;
		}
	},
	
	addOnChangeListener: function(xhr, fn) {
		switch(this.env) {
			case HttpRequest.env.modern:
			case HttpRequest.env.ie6:
				xhr.onreadystatechange = fn;
				break;
			case HttpRequest.env.ie8:
				xhr.onload = fn;
				break;
		}
	}
});


module.exports = HttpRequest;
},{"../../utils/bind":20,"../../utils/copy":21,"../../utils/extend":22,"./HttpResponse":15,"tiny-emitter":25}],15:[function(require,module,exports){
"use strict";

var extend		= require("../../utils/extend");
var EventEmitter = require("tiny-emitter");

function HttpResponse(xhr) {
	this.statusCode = xhr.status;
	this.statusMessage = xhr.statusText;
	this.headers = this.parseHeaders(xhr.getAllResponseHeaders());
	if(xhr.responseText !== "") {
		this.data = xhr.responseText;
	} else if(xhr.responseXml !== "") {
		this.data = xhr.responseXml;
	}
}

HttpResponse.prototype = new EventEmitter();
HttpResponse.prototype.constructor = HttpResponse;

extend(HttpResponse.prototype, {
	parseHeaders: function (headerStr) {
		var headers = {};
		if (!headerStr) {
			return headers;
		}
		var headerPairs = headerStr.split('\u000d\u000a');
		for (var i = 0, ilen = headerPairs.length; i < ilen; i++) {
			var headerPair = headerPairs[i];
			var index = headerPair.indexOf('\u003a\u0020');
			if (index > 0) {
			var key = headerPair.substring(0, index);
			var val = headerPair.substring(index + 2);
			headers[key] = val;
			}
		}
		return headers;
	}
});

module.exports = HttpResponse;
},{"../../utils/extend":22,"tiny-emitter":25}],16:[function(require,module,exports){
"use strict";

var bind 			= require("../../utils/bind");
var extend			= require("../../utils/extend");
var HttpRequest		= require("./HttpRequest");


var Http = {};

extend(Http, {
	request: function(options, callback) {
		var request = new HttpRequest(options);
		if(typeof callback === "function") {
			request.on("done", callback);
		}
		return request;	
	}
});

module.exports = Http;
},{"../../utils/bind":20,"../../utils/extend":22,"./HttpRequest":14}],17:[function(require,module,exports){
"use strict";

var Url = {
	parse: function(url) {
		var parsed = {};
		if(typeof url === "string") {
			var parser = document.createElement('a');
			parser.href = url;
			
			parsed.href = url;
			parsed.protocol = parser.protocol;
			parsed.hostname = parser.hostname;
			parsed.port = parser.port;    
			parsed.pathname = parser.pathname;
			parsed.search = parser.search;  
			parsed.hash = parser.hash;
		}
		
		return parsed;
	}
};


module.exports = Url;
},{}],18:[function(require,module,exports){
"use strict";

module.exports = {

	serialize: function(xml) {
		var result;
		if(xml) {
			try {
				var serializer = new XMLSerializer();
				result = serializer.serializeToString(xml);
			} catch(e) {
				result = xml;
			}
		}
		return result;
	},

	parse: function(xmlstring) {
		var result;
		if(typeof xmlstring === "string") {
			try {
				console.log("Calling DOMParser with: "+xmlstring);
				var parser = new DOMParser();
				result = parser.parseFromString(xmlstring, "application/xml");
				console.log("Result is");
				console.log(result);
			} catch(e) {
				result = xmlstring;
			}
		}
		return result;
	}

};

},{}],19:[function(require,module,exports){
"use strict";

function Interval(func, wait, times, immediate) {
    this.timeout = null;
    this.canceled = false;
    var self = this;
    
    var interv = function(w, t){
        return function(){
            if(typeof t === "undefined" || t-- > 0){
                try{
                    func.call(null);
                }
                catch(e){
                    t = 0;
                    throw e.toString();
                }
                if(!self.canceled) {
                    self.timeout = setTimeout(interv, w);
                }
            }
        };
    }(wait, times);
    
    this.cancel = function() {
        this.canceled = true;
        clearTimeout(this.timeout);
    };
    
    this.timeout = setTimeout(interv, wait);
    
    if(!!immediate) {
        interv();
    } else {
        this.timeout = setTimeout(interv, wait);
    } 

    
}

module.exports = Interval;
},{}],20:[function(require,module,exports){
"use strict";

module.exports = function bind(context, fn) {
	if(context && fn && typeof fn === "function") {
		return function() {
			return fn.apply(context, arguments);
		};
	}
};
},{}],21:[function(require,module,exports){
"use strict";

module.exports = function copy(src) {
	var copied;
	if(src instanceof Array) {
		copied = src.slice(0, src.length);	
	} else if(typeof src === "object") {
		copied = {};
		for(var key in src) {
			if(src.hasOwnProperty(key)) {
				copied[key] = src[key];
			}
		}
	} else {
		copied = src;
	}
	return copied;
};
},{}],22:[function(require,module,exports){
"use strict";

var toArray = require("./toArray");

module.exports = function extend() {
	var args = toArray(arguments), dest = args[0], src;
	if(typeof dest === "object" || typeof dest === "function") {
		for(var i=1; i<args.length; i++) {
			src = args[i];
			if(typeof src === "object") {
				for(var key in src) {
					if(src.hasOwnProperty(key)) {
						dest[key] = src[key];
					}
				}
			}
		}
	}
	
	return dest;
};
},{"./toArray":23}],23:[function(require,module,exports){
"use strict";

module.exports = function toArray(arr) {
	return Array.prototype.slice.call(arr);
};
},{}],24:[function(require,module,exports){
(function (global){
/*! Native Promise Only
    v0.8.1 (c) Kyle Simpson
    MIT License: http://getify.mit-license.org
*/

(function UMD(name,context,definition){
	// special form of UMD for polyfilling across evironments
	context[name] = context[name] || definition();
	if (typeof module != "undefined" && module.exports) { module.exports = context[name]; }
	else if (typeof define == "function" && define.amd) { define(function $AMD$(){ return context[name]; }); }
})("Promise",typeof global != "undefined" ? global : this,function DEF(){
	/*jshint validthis:true */
	"use strict";

	var builtInProp, cycle, scheduling_queue,
		ToString = Object.prototype.toString,
		timer = (typeof setImmediate != "undefined") ?
			function timer(fn) { return setImmediate(fn); } :
			setTimeout
	;

	// dammit, IE8.
	try {
		Object.defineProperty({},"x",{});
		builtInProp = function builtInProp(obj,name,val,config) {
			return Object.defineProperty(obj,name,{
				value: val,
				writable: true,
				configurable: config !== false
			});
		};
	}
	catch (err) {
		builtInProp = function builtInProp(obj,name,val) {
			obj[name] = val;
			return obj;
		};
	}

	// Note: using a queue instead of array for efficiency
	scheduling_queue = (function Queue() {
		var first, last, item;

		function Item(fn,self) {
			this.fn = fn;
			this.self = self;
			this.next = void 0;
		}

		return {
			add: function add(fn,self) {
				item = new Item(fn,self);
				if (last) {
					last.next = item;
				}
				else {
					first = item;
				}
				last = item;
				item = void 0;
			},
			drain: function drain() {
				var f = first;
				first = last = cycle = void 0;

				while (f) {
					f.fn.call(f.self);
					f = f.next;
				}
			}
		};
	})();

	function schedule(fn,self) {
		scheduling_queue.add(fn,self);
		if (!cycle) {
			cycle = timer(scheduling_queue.drain);
		}
	}

	// promise duck typing
	function isThenable(o) {
		var _then, o_type = typeof o;

		if (o != null &&
			(
				o_type == "object" || o_type == "function"
			)
		) {
			_then = o.then;
		}
		return typeof _then == "function" ? _then : false;
	}

	function notify() {
		for (var i=0; i<this.chain.length; i++) {
			notifyIsolated(
				this,
				(this.state === 1) ? this.chain[i].success : this.chain[i].failure,
				this.chain[i]
			);
		}
		this.chain.length = 0;
	}

	// NOTE: This is a separate function to isolate
	// the `try..catch` so that other code can be
	// optimized better
	function notifyIsolated(self,cb,chain) {
		var ret, _then;
		try {
			if (cb === false) {
				chain.reject(self.msg);
			}
			else {
				if (cb === true) {
					ret = self.msg;
				}
				else {
					ret = cb.call(void 0,self.msg);
				}

				if (ret === chain.promise) {
					chain.reject(TypeError("Promise-chain cycle"));
				}
				else if (_then = isThenable(ret)) {
					_then.call(ret,chain.resolve,chain.reject);
				}
				else {
					chain.resolve(ret);
				}
			}
		}
		catch (err) {
			chain.reject(err);
		}
	}

	function resolve(msg) {
		var _then, self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		try {
			if (_then = isThenable(msg)) {
				schedule(function(){
					var def_wrapper = new MakeDefWrapper(self);
					try {
						_then.call(msg,
							function $resolve$(){ resolve.apply(def_wrapper,arguments); },
							function $reject$(){ reject.apply(def_wrapper,arguments); }
						);
					}
					catch (err) {
						reject.call(def_wrapper,err);
					}
				})
			}
			else {
				self.msg = msg;
				self.state = 1;
				if (self.chain.length > 0) {
					schedule(notify,self);
				}
			}
		}
		catch (err) {
			reject.call(new MakeDefWrapper(self),err);
		}
	}

	function reject(msg) {
		var self = this;

		// already triggered?
		if (self.triggered) { return; }

		self.triggered = true;

		// unwrap
		if (self.def) {
			self = self.def;
		}

		self.msg = msg;
		self.state = 2;
		if (self.chain.length > 0) {
			schedule(notify,self);
		}
	}

	function iteratePromises(Constructor,arr,resolver,rejecter) {
		for (var idx=0; idx<arr.length; idx++) {
			(function IIFE(idx){
				Constructor.resolve(arr[idx])
				.then(
					function $resolver$(msg){
						resolver(idx,msg);
					},
					rejecter
				);
			})(idx);
		}
	}

	function MakeDefWrapper(self) {
		this.def = self;
		this.triggered = false;
	}

	function MakeDef(self) {
		this.promise = self;
		this.state = 0;
		this.triggered = false;
		this.chain = [];
		this.msg = void 0;
	}

	function Promise(executor) {
		if (typeof executor != "function") {
			throw TypeError("Not a function");
		}

		if (this.__NPO__ !== 0) {
			throw TypeError("Not a promise");
		}

		// instance shadowing the inherited "brand"
		// to signal an already "initialized" promise
		this.__NPO__ = 1;

		var def = new MakeDef(this);

		this["then"] = function then(success,failure) {
			var o = {
				success: typeof success == "function" ? success : true,
				failure: typeof failure == "function" ? failure : false
			};
			// Note: `then(..)` itself can be borrowed to be used against
			// a different promise constructor for making the chained promise,
			// by substituting a different `this` binding.
			o.promise = new this.constructor(function extractChain(resolve,reject) {
				if (typeof resolve != "function" || typeof reject != "function") {
					throw TypeError("Not a function");
				}

				o.resolve = resolve;
				o.reject = reject;
			});
			def.chain.push(o);

			if (def.state !== 0) {
				schedule(notify,def);
			}

			return o.promise;
		};
		this["catch"] = function $catch$(failure) {
			return this.then(void 0,failure);
		};

		try {
			executor.call(
				void 0,
				function publicResolve(msg){
					resolve.call(def,msg);
				},
				function publicReject(msg) {
					reject.call(def,msg);
				}
			);
		}
		catch (err) {
			reject.call(def,err);
		}
	}

	var PromisePrototype = builtInProp({},"constructor",Promise,
		/*configurable=*/false
	);

	// Note: Android 4 cannot use `Object.defineProperty(..)` here
	Promise.prototype = PromisePrototype;

	// built-in "brand" to signal an "uninitialized" promise
	builtInProp(PromisePrototype,"__NPO__",0,
		/*configurable=*/false
	);

	builtInProp(Promise,"resolve",function Promise$resolve(msg) {
		var Constructor = this;

		// spec mandated checks
		// note: best "isPromise" check that's practical for now
		if (msg && typeof msg == "object" && msg.__NPO__ === 1) {
			return msg;
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			resolve(msg);
		});
	});

	builtInProp(Promise,"reject",function Promise$reject(msg) {
		return new this(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			reject(msg);
		});
	});

	builtInProp(Promise,"all",function Promise$all(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}
		if (arr.length === 0) {
			return Constructor.resolve([]);
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			var len = arr.length, msgs = Array(len), count = 0;

			iteratePromises(Constructor,arr,function resolver(idx,msg) {
				msgs[idx] = msg;
				if (++count === len) {
					resolve(msgs);
				}
			},reject);
		});
	});

	builtInProp(Promise,"race",function Promise$race(arr) {
		var Constructor = this;

		// spec mandated checks
		if (ToString.call(arr) != "[object Array]") {
			return Constructor.reject(TypeError("Not an array"));
		}

		return new Constructor(function executor(resolve,reject){
			if (typeof resolve != "function" || typeof reject != "function") {
				throw TypeError("Not a function");
			}

			iteratePromises(Constructor,arr,function resolver(idx,msg){
				resolve(msg);
			},reject);
		});
	});

	return Promise;
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],25:[function(require,module,exports){
function E () {
	// Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
	on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;

},{}]},{},[1]);
