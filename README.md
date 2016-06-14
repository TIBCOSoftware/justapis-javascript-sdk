
justapis-javascript-sdk
================================================================================

[![Latest NPM release][npm-badge]][npm-badge-url]
[![TravisCI Build Status][travis-badge]][travis-badge-url]

[npm-badge]: https://img.shields.io/npm/v/justapis-javascript-sdk.svg
[npm-badge-url]: https://www.npmjs.com/package/justapis-javascript-sdk
[travis-badge]: https://img.shields.io/travis/AnyPresence/justapis-javascript-sdk.svg
[travis-badge-url]: https://travis-ci.org/AnyPresence/justapis-javascript-sdk

A lightweight JavaScript SDK to connect to a JustAPIs gateway in Node or
the browser.


Dependencies
--------------------------------------------------------------------------------

* [MQTT.js](https://github.com/mqttjs/MQTT.js)
* [Native Promise Only](https://github.com/getify/native-promise-only)
* [Tiny Emitter](https://github.com/scottcorgan/tiny-emitter)
* [node-url](https://github.com/defunctzombie/node-url)
* [xml2js](https://www.npmjs.com/package/xml2js) (Node-only)
* [xmlserializer](https://www.npmjs.com/package/xmlserializer) (Node-only)


Features
--------------------------------------------------------------------------------

* Browser & Node.js support
* HTTP request/response connection
* HTTP Public Key Pinning
* Per-request caching
* Pausable/Resumable asynchronous request queue
* MQTT client support


Install via NPM
--------------------------------------------------------------------------------

```bash
$ npm install justapis-javascript-sdk
```


Setup
--------------------------------------------------------------------------------

The SDK is built with browserify. If you would like to add a single bundled file
you can find it in the `dist` folder.

```html
<script src="justapis-javascript-sdk/dist/justapis-javascript-sdk.min.js"></script>
```

Else, if you are using browserify in your project you probably prefer to use
`require` to load the dependency.

```javascript
var APGateway = require("justapis-javascript-sdk");
```


### Creating a Gateway

The main object in the SDK is APGateway, you can think of it as an http client.
To make a request to an endpoint you just need to do

```javascript
var APGateway = require("justapis-javascript-sdk");

var options = {
	url: "http://my.gateway.domain.org/users",
	method: "GET",
	headers: {
		"Foo": "Bar"
	},
	data: {
		"name": "john"
	}
};

// If you prefer objects you can do:
var gw = new APGateway(options);

// Or you can create it like this
var gw = APGateway.create(options);

// Now executing a request is as easy as
gw.execute().then(function(response) {
	// Response came back ok...
	console.log(response.data);
}).catch(function(error) {
	// An error occured :(
	console.log(error.message);
});

// Also you can reuse your gateway as many times as you like.
// It will send the same request as before...
gw.execute();

// Or you can change only the pieces that you want and keep using it...
gw.method("POST").execute();
```


### Copying a Gateway

A nice feature of gateways is that they can be copied. By copying a gateway you
get all the configuration from the original, so you don't have to
repeat yourself.

```javascript
var gw = new APGateway({
	headers: {
		"Foo": "Bar"
	}
});

// just call the copy method
var gwCopy = gw.copy();

gwCopy.headers({
	"Foo": "Hello World!"
});

gw.headers(); // will return { "Foo": "Bar" }
gwCopy.headers(); // will return { "Foo": "Hello World!" }
```


Caching Requests
--------------------------------------------------------------------------------

**Note: The Caching service behaves differently in Node than in the browser**

`APGateway` allow for request caching per request. Only responses to GET
requests are cached, and this is enabled by default.

```javascript
var gateway = new APGateway();
gateway.cache(false);   // Disable caching from now on...
gateway.execute();      // Send request without caching the response
gateway.cache(true)     // Enable caching from now on...
```

When using it in Node, responses will be cached in-memory only by default.
In the browser however, cached responses will be saved to `localStorage`
if available.

Since `localStorage` is persistent, you might want to flush it at some point.

```javascript
// This will only remove localStorage entries set by
// APGateway's request cache
APGateway.RequestCache.flush();
```

Cached responses have a TTL (time to live) of 1 week (604800000 milliseconds).
Any response older than that will be ignored and removed from the cache.
If you would like to use a different TTL you can set it like so:

```javascript
// ttl is in milliseconds
APGateway.RequestCache.ttl = 60000; // set ttl to 1 minute
```


### Custom Persistence

In some cases you may want to persist the cache in a different way. In the case
of Node, for example, you may want to persist cached instances through a
database or external service. In order to do that you can replace `APGateway.RequestCache.storage` with your own implementation. Here is a small
example of how to do just that:

```javascript
// The storage object MUST have the following methods
APGateway.RequestCache.storage = {
    /**
     * Set key/value pair in storage
     *
     * key -> string key identifying the value
     * record -> an Object containing two attributes:
     *      'value' -> the Object being cached
     *      'timestamp' -> already serialized Date string
     *
     * returns -> a Promise to be resolved when set is finished (no resolve value needed)
     */
    set: function(key, record) {...},

    /**
     * Get a value from storage
     *
     * key -> string identifying the value to retrieve
     *
     * returns -> a Promise that resolves with the retrieved Object
     */
    get: function(key) {...},

    /**
     * Get all values in the storage. A prefix is passed that identifies the entire cache.
     * This prefix is prepended to every key and used to differentiate one cache instance from another.
     * It is only passed as a convenience, it is not required to use it internally.
     *
     * prefix -> string prefix identifying the cache
     *
     * returns -> a Promise that resolves with an Array of the retrieved objects (or empty Array if none)  
     */
    getAll: function(prefix) {...},

    /**
     * Removes a single record from the storage
     *
     * key -> string key identifying the record
     *
     * returns -> a Promise that resolves when the record has been removed (no resolve value needed)
     */
    remove: function(key) {...},

    /**
     * Removes all records from storage
     *
     * prefix -> Same as with 'getAll()'
     *
     * returns -> a Promise that resolves when flushing is complete (no resolve value needed)
     */
    flush: function(prefix) {...}

};
```

You may have noticed that all the required methods to override return a Promise,
this is meant as a convenience so you can easily work with async operations when
persisting records. Any Promises/A+ compliant implementation can be used
(or even native Promises if available), but in case you do not want to add a
promise package just for this, **APGateway** uses an implementation internally
that you can find in `APGateway.Promise`.


Async request queue
--------------------------------------------------------------------------------

**APGateway** instances use an async queue internally to send requests.
This queue is shared across instances and can be paused/resumed to avoid sending
further requests at any time. If your application goes offline you can pause the
queue, wait for reconnection, and resume it without loosing requests.

```javascript
APGateway.Queue.pause();
var gateway = new APGateway();
gateway
    .url('http://localhost:1337/resource')
    .execute() // This adds the request to the queue
    .then(function(response) { /* Got response back */ })
    .catch(function(error) { /* Got an error */ });

// The queue will continue to build up until resumed
APGateway.Queue.resume();
```

Whenever the queue is resumed it will start sending pending requests
asynchronously. Because the queue can get pretty big while paused, the queue
will throttle the flow of requests being sent to avoid flooding the server.
The default throttle time is 300 milliseconds, but you can adjust this by doing `APGateway.Queue.throttleBy(amountInMilliseconds)`.


### Persisting the Queue

In some cases you might want to save the state of the queue either to
`localStorage` or a database. For that purpose there's an export method on the
queue you can use.

**Note: The queue must be paused before calling export,
otherwise an Error will be thrown**

```javascript
// Pause the queue
APGateway.Queue.pause();
// requests will be an Array of requests
var requests = APGateway.Queue.export();

// persists requests...
```

Now when get your persisted requests you can just resend them.

```javascript
// Get the saved requests from your storage of choice

var gateway = new APGateway();
persistedRequests.forEach(function(requestData) {
   // First we need to recreate the APRequest object
   var request = Object.create(APGateway.APRequest, requestData);
   gateway
    .sendRequest(request)
    .then(function(res) {
        // Do something else
    })
    .catch(function(error) {
        // There was an error
    });
});
```


### MQTT

Once instantiated, the MQTT client behaves exactly as described in
[the MQTT.js documentation](https://github.com/mqttjs/MQTT.js).

Supported protocols include `mqtt`, `ws`, and `wss`.  Typically `mqtt` is used
by Node.js and `wss`/`ws` by the browser.

Example MQTT usage:

```javascript
// Create a Gateway and specify a host, optionally including a protocol.
// If protocol is omitted, `wss` is used.
var gateway = new APGateway({url: 'example.net/mqtt'}),
		// Create an MQTT client instance.  Client connects automatically.
		client = gateway.mqtt();

// Interact with the MQTT client as described in the MQTT documentation.
client.on('connect', function () {
  client.subscribe('presence');
  client.publish('presence', 'Hello mqtt');
});
client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString());
  client.end();
});
```


APGateway Instance Methods
--------------------------------------------------------------------------------

### Default Properties

```javascript
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
data: {},
headers: {
	'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
},
parsers: {
    json: JSONParser,
    form: FormDataParser,
    xml: XMLParser
},
transformations: {
    request: [ EncodeTransformation ],
	response: [ DecodeTransformation, CacheResponse ]
}
```


### Methods


#### `url( url )`
Returns the current url or the APGateway instance for quick chaining

* `url`: `string`
	* If `url` is undefined the method will act as a getter, else it will set the
	value and return `this`.


#### `method( method )`
Returns the current http method or the APGateway instance for quick chaining

* `method`: `string`
	* Accepted values `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
	* If `method` is undefined the method will act as a getter, else it will set
	the value and return `this`.


#### `data( data )`
Returns the current request data or the APGateway instance for quick chaining

* `data`: `object`
	* If `data` is undefined the method will act as a getter, else it will set the
	value and return `this`.


#### `dataType( dataType )`
Returns the current response data type or the APGateway instance for
quick chaining

* `dataType`: `string`
	* If `dataType` is undefined the method will act as a getter, else it will set
	the value and return `this`.  `json` and `xml` dataTypes are parsed
	automatically, any other dataType will be returned as a string.


#### `contentType( contentType )`
Returns the current content type or the APGateway instance for quick chaining

* `contentType`: `string`
	* If `contentType` is undefined the method will act as a getter, else it will
	set the value and return `this`.


#### `headers( headers )`
Returns the current headers or the APGateway instance for quick chaining

* `headers`: `object`
	* The key-value pairs in `headers` will be appended to the current ones.
	* If `headers` is undefined the method will act as a getter, else it will set
	the value and return `this`.


#### `withCredentials( withCredentials )`

Returns the current value of withCredentials or the APGateway instance for
quick chaining

Enabling `withCredentials` will cause any cookies to be included in the request
to the server. The server needs to be configured to enable credentials as well
by adding `Access-Control-Allow-Credentials: true` as a response header.

* `withCredentials`: `boolean`
	* Default value: `false`
	* If `withCredentials` is undefined the method will act as a getter, else it
	will set the value and return `this`.


#### `silentFail( silent )`

Returns the current value of silentFail or the APGateway instance for
quick chaining

When a request is not successful `APGateway` will throw an error.
Setting `silentFail` to `true` will cause the gateway to ignore those errors.

* `silent`: `boolean`
	* Default value: `true`.  If `silent` is undefined the method will act as a
	getter, else it will set the value and return `this`.


#### `cache( active )`

Returns the current value of cache or the APGateway instance for quick chaining

* `active`: `boolean`
	* Default value: `true`.  If `active` is undefined the method will act as a
	getter, else it will set the value and return `this`.


#### `copy()`

Returns a shallow copy of the APGateway instance.


#### `requestTransformations( transformations )`

Returns the current request transformations or the APGateway instance for
quick chaining

* `transformations`: `[function]`
	* Array of functions to transform the request configuration **before** it is
	sent to the server
	```javascript
		gw.requestTransformations([
			// transformations must ALWAYS return "request"
			// in order for the entire chain to work properly
			function(request) {...},
			function(request) {...}		
		]);
	```
	If undefined the method will act as a getter, else it will set the value and
	return `this`.


#### `responseTransformations( transformations )`

Returns the current response transformations or the APGateway instance for
quick chaining

* `transformations`: `[function]`
	* Array of functions to transform the response object **after** it returns
	from the server
	```javascript
		gw.responseTransformations([
			// transformations must ALWAYS return "response"
			// in order for the entire chain to work properly
			function(response) {...},
			function(response) {...}		
		]);
	```
	If undefined the method will act as a getter, else it will set the value and
	return `this`.


#### `addRequestTransformation( transformation )`

Returns the APGateway instance for quick chaining

* `transformation`: `function`
	* Adds the transformation at the end of the request transformation chain


#### `addResponseTransformation( transformation )`

Returns the APGateway instance for quick chaining

* `transformation`: `function`
	* Adds the transformation at the end of the response transformation chain


#### `hpkp( options )`

Sets up [HTTP Public Key Pinning](https://developer.mozilla.org/en/docs/Web/Security/Public_Key_Pinning)
for the **APGateway** instance.

* `options`: `object`
  * `sha256s`: `[string]` (required)
      * Array of **two** encoded public key information hashes. One is actually
			used, the other is kept as backup.
  * `maxAge`: `number` (required)
      * The time in seconds that the pinned key will be remembered for.
  * `includeSubdomains`: `boolean` (optional)
      * Applies the pinned key to subdomains also.
  * `reportOnly`: `boolean` (optional)
      * Specifies if pin validation failures should be reported to the given
			URL (if true `reportUri` must be present as well).
  * `reportUri`: `string` (optional)
      * URL to send pin validation failure reports to.


#### `execute()`

Returns a Promise

* Executes a request with the current configuration


Framework Integration
--------------------------------------------------------------------------------

### React

The SDK will work with React.js out of the box since its plain JavaScript.


### Angular

Integrating with Angular.js is not a problem, here is an example of how you would use it.

```javascript
angular.module('MyModule')
	.controller('MyModuleController', ['$scope', function($scope) {
		// Declare a default message to show
		$scope.message = "Default message";
		// Create the gateway as usual...
		var gateway = new APGateway();

		gateway
		.url('http://my.service/message')
		.execute()
		.then(function(response) {
			// Keep in mind, when updating the $scope, to use $apply
			//   so angular is made aware of the change
			$scope.$apply(function() {
				$scope.message = response.data;
			});
		});


	});
```


### Ember

Like React or Angular, there is no restriction to use APGateway in an Ember application. If you're using Ember Data however you might want to integrate APGateway so you can load Models from it.


#### Ember Data

In order to integrate with Ember Data you will want to create an [Adapter](http://emberjs.com/api/data/classes/DS.Adapter.html).

This example code shows the basic principle of how to integrate the two.

**NOTE**: For simplicity's sake the example only shows implementations of `findRecord` and `createRecord` but when extending `DS.Adapter` you **must** implement the other methods too.

```javascript
// url of your endpoint
var URL = "http://localhost:5000/todos";
var gateway = new APGateway();

// This helper will make sure that the response of the gateway runs
// inside Ember's run loop.
function runRequestToGateway(gateway) {
	return Ember.RSVP.Promise(function(resolve, reject) {
		gateway
		.execute()
		.then(function(response) {
			Ember.run(null, resolve, response.data);
		})
		.catch(function(error) {
			Ember.run(null, reject, error);
		});
	});
}

// Register an ApplicationAdapter that uses APGateway internally...
Todos.ApplicationAdapter = DS.Adapter.extend({

	findRecord: function(store, type, id, snapshot) {
		gateway
		.method("GET")
		.url(URL + "/" + id)
		.silentFail(false);

		return runRequestToGateway(gateway);
	},

	createRecord: function(store, type, snapshot) {
		var data = this.serialize(snapshot, { includeId: true });

		gateway
		.url(URL)
		.method("POST")
		.data(data)
		.silentFail(false);

		return runRequestToGateway(gateway);
	},

	updateRecord: function(store, type, snapshot) {...},

	deleteRecord: function(store, type, snapshot) {...},

	findAll: function(store, type, sinceToken, snapshotRecordArray) {...},

	query: function(store, type, query, recordArray) {...}
});
```


Development
--------------------------------------------------------------------------------

If you would like to develop in the SDK you can just download the repository and do

```bash
npm install
```

Once that finishes, just use grunt to start the `watch` process

```bash
grunt
```
