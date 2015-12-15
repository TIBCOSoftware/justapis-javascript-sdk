(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var APGateway = require('./lib/gateway/APGateway');

if(window) {
	window.APGateway = APGateway;
}
},{"./lib/gateway/APGateway":2}],2:[function(require,module,exports){
"use strict";

var Request 				= require("../request/APRequest");
var bind					= require("../utils/bind");
var extend					= require("../utils/extend");
var copy					= require("../utils/copy");
var JSONParser				= require("../parsers/json");
var FormDataParser			= require("../parsers/formData");
var EncodeTransformation	= require("./transformations/encode");
var DecodeTransformation	= require("./transformations/decode");


function APGateway(options) {
	this.config = {};
	
	extend(this.config, APGateway.defaults);
	this.config.transformations = {
		request: copy(APGateway.defaults.transformations.request),
		response: copy(APGateway.defaults.transformations.response)
	};
	
	extend(this.config, options);
}

/**
 * Static
 */
APGateway.defaults = {
	url: "http://localhost:5000",
	method: "GET",
	async: true,
	crossDomain: true,
	dataType: "json",
	contentType: "application/json",
	data: {},
	headers: {},
	parsers: {
		json: JSONParser,
		form: FormDataParser,
		xml: undefined
	},
	transformations: {
		request: [ EncodeTransformation ],
		response: [ DecodeTransformation ]
	}
};

APGateway.create = function(options) {
	return new APGateway(options);
};

/**
 * Methods
 */
extend(APGateway.prototype, {
	
	url: function(url) {
		if(url) {
			if(typeof url === "string") {
				this.config.url = url;
			}
		} else {
			return this.config.url; 
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
	
	crossDomain: function(cors) {
		if(typeof cors === "boolean") {
			this.config.crossDomain = cors;
		} else {
			return this.config.crossDomain;
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
	
	execute: function() {
		var reqTrans = this.config.transformations.request, resTrans = this.config.transformations.response, $config = extend({}, this.config), options;
		
		// Remove transformations from the request options so they can't be modified on the fly
		delete $config.transformations;
		
		options = $config;
		for(var i=0; i<reqTrans.length; i++) {
			options = reqTrans[i](options);
		}		
		var request = new Request(options);
		
		return request.send().then(bind(this, function(response) {
			var res = response;
			for(var i=0; i<resTrans.length; i++) {
				res = resTrans[i](res);
			}
			return res;
		}));
	},
	
});

module.exports = APGateway;
},{"../parsers/formData":5,"../parsers/json":6,"../request/APRequest":7,"../utils/bind":9,"../utils/copy":10,"../utils/extend":11,"./transformations/decode":3,"./transformations/encode":4}],3:[function(require,module,exports){
"use strict";

function decode(response) {
	switch(response.contentType) {
		case "xml":
			// Coming soon...
			break;
		case "json":
			response.data = response.origin.parsers.json.fromJson(response.data);
			break;
	}
	return response;
}

module.exports = decode;
},{}],4:[function(require,module,exports){
"use strict";

function encode(request) {
	if(request.method !== "GET") {
		switch(request.contentType) {
			case "application/x-www-form-urlencoded; charset=UTF-8":
				request.data = request.parsers.form.toFormData(request.data);
				break;
			case "application/xml":
				// Coming soon..
				break;
			case "application/json":
				request.data = request.parsers.json.toJson(request.data);
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
			params = paramArray.join("&");
		}
		if(params !== "") {
			params = "?"+params;
		}
		request.url += params;
	}
	return request;	
}


module.exports = encode;
},{}],5:[function(require,module,exports){
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
	toFormData: function(data) {
		if(window && window.FormData) {
			var form = new FormData();
			if(typeof data === "object") {
				for(var name in data) {
					form.append(name, data[name]);
				}
			}
			return form;
		} else {
			return encodeToFormData(data);
		}
	}
};
},{}],6:[function(require,module,exports){
"use strict";

module.exports = {
	toJson: function(data) {
		return (data) ? JSON.stringify(data) : undefined;
	},
	fromJson: function(json) {
		return (json) ? JSON.parse(json) : undefined;
	}
};
},{}],7:[function(require,module,exports){
"use strict";

var Promise 	= require("native-promise-only");
var bind 		= require("../utils/bind");
var extend		= require("../utils/extend");
var APResponse	= require("../response/APResponse");

function Request(options) {
	this.detectEnv();
	options = options || {};
	extend(this, options);
}

/**
 * Static
 */
Request.states = {
	'UNSENT'			: 0,
	'OPENED'			: 1,
	'HEADERS_RECEIVED'	: 2,
	'LOADING'			: 3,
	'DONE'				: 4 
};

Request.env = {
	modern	: 0,
	ie8		: 1,
	ie6		: 2
};


/**
 * Methods
 */
extend(Request.prototype, {
	
	detectEnv: function() {
		if(typeof XMLHttpRequest !== "undefined") {
			this.env = Request.env.modern;
		} else if(typeof XDomainRequest !== "undefined") {
			this.env = Request.env.ie8;
		} else if(typeof ActiveXObject !== "undefined") {
			this.env = Request.env.ie6;
		}
	},
	
	addOnChangeListener: function(xhr, fn) {
		switch(this.env) {
			case Request.env.modern:
			case Request.env.ie6:
				xhr.onreadystatechange = fn;
				break;
			case Request.env.ie8:
				xhr.onload = fn;
				break;
		}
	},
	
	send: function() {
		var xhr;
		switch(this.env) {
			case Request.env.modern:
				xhr = new window.XMLHttpRequest();
				break;
			case Request.env.ie8:
				xhr = new window.XDomainRequest();
				break;
			case Request.env.ie6:
				xhr = new window.ActiveXObject("Microsoft.XMLHTTP");
				break;
		}
		console.log("Sending request to url: "+this.url);
		xhr.open(this.method, this.url, this.async);
		xhr.setRequestHeader("Content-Type", this.contentType);
		
		for(var key in this.headers) {
			if(this.headers.hasOwnProperty(key)) {
				xhr.setRequestHeader(key, this.headers[key]);
			}
		}
		
		return new Promise(bind(this, function(resolve, reject) {
			this.addOnChangeListener(xhr, function() {
				if(xhr.readyState === Request.states.DONE) {
					var response = new APResponse(xhr, this);
					if(response.statusCode >= 200 && response.statusCode < 400) {
						resolve(response);
					} else {
						reject(new Error("APRequest -> Server responded with "+response.statusCode+": "+response.text));
					}
				}
			});
			
			xhr.ontimeout = function() {
				var response = new APResponse(xhr, this);
				reject(new Error("APRequest -> Request timeout - "+response.statusCode+" "+response.text));
			};
			
			xhr.send(this.data);
			console.dir(xhr);
		}));	
	}
});

module.exports = Request;
},{"../response/APResponse":8,"../utils/bind":9,"../utils/extend":11,"native-promise-only":13}],8:[function(require,module,exports){
"use strict";

var extend	= require("../utils/extend");

function APResponse(xhr, request) {
	extend(this, APResponse.defaults);
	
	this.statusCode = xhr.status;
	this.text = xhr.statusText;
	this.headers = this.parseHeaders(xhr.getAllResponseHeaders());
	extend(this.origin, request);
	
	if(xhr.responseText !== "") {
		this.data = xhr.responseText;
	} else if(xhr.responseXml !== "") {
		this.data = xhr.responseXml;
	}
}

APResponse.defaults = {
	statusCode: 0,
	text: "undefined",
	data: {},
	origin: {}
};


extend(APResponse.prototype, {
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

module.exports = APResponse;
},{"../utils/extend":11}],9:[function(require,module,exports){
"use strict";

module.exports = function bind(context, fn) {
	if(context && fn && typeof fn === "function") {
		return function() {
			return fn.apply(context, arguments);
		};
	}
};
},{}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
"use strict";

var toArray = require("./toArray");

module.exports = function extend() {
	var args = toArray(arguments), dest = args[0], src;
	if(typeof dest === "object") {
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
},{"./toArray":12}],12:[function(require,module,exports){
"use strict";

module.exports = function toArray(arr) {
	return Array.prototype.slice.call(arr);
};
},{}],13:[function(require,module,exports){
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
},{}]},{},[1]);
