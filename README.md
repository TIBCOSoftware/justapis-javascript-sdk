#JustAPIs JavaScript SDK

##Overview

Lightweight JavaScript SDK to connect to a JustAPIs gateway through a web client.

##Dependencies

* [Bluebird](https://github.com/petkaantonov/bluebird)

##Setup

The SDK is built with browserify. If you would like to add a single bundled file you can find it in the `dist` folder.

```html
<script src="justapis-javascript-sdk/dist/ap_gateway.js"></script>
```

Else, if you are using browserify in your project you probably prefer to use `require` to load the dependency.

```javascript
var APGateway = require("justapis-javascript-sdk");
```

###Creating a Gateway

The main object in the SDK is APGateway, you can think of it as an http client. To make a request to an endpoint you just need to do

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

###Copying a Gateway

A nice feature of gateways is that they can be copied. By copying a gateway you get all the configuration from the original, so you don't have to repeat yourself.

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

##APGateway instance methods

###Default properties

```javascript
url: "http://localhost:5000",
method: "GET",
async: true,
crossDomain: true,
dataType: "json",
contentType: "application/json",
data: undefined,
headers: {},
transformations: {
	request: [],
	response: []
}
```

###Methods

**.url( *url* )**

* *url* -> **string**
	* If *url* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current url or the APGateway instance for quick chaining

**.method( *method* )**

* *method* -> **string**
	* Accepted values "GET", "POST", "PUT", "PATCH", "DELETE"
	* If *method* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current http method or the APGateway instance for quick chaining

**.data( *data* )**

* *data* -> **object**
	* If *data* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current request data or the APGateway instance for quick chaining

**.contentType( *contentType* )**

* *contentType* -> **string**
	* If *contentType* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current url or the APGateway instance for quick chaining

**.headers( *headers* )**

* *headers* -> **object**
	* The key-value pairs in *headers* will be appended to the current ones.
	* If *headers* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current headers or the APGateway instance for quick chaining

**.crossDomain( *crossDomain* )**

* *crossDomain* -> **boolean**
	* If *crossDomain* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current url or the APGateway instance for quick chaining

**.copy()**

Returns a shallow copy of the APGateway instance.

**.requestTransformations( *transformations* )**

* *transformations* -> **Function[]**
	* If undefined the method will act as a getter, else it will set the value and return `this`.
	* Array of functions to transform the request configuration **before** it is sent to the server
	```javascript
		gw.requestTransformations([
			// transformations must ALWAYS return "request" 
			// in order for the entire chain to work properly
			function(request) {...},
			function(request) {...}		
		]);
	```

Returns the current request transformations or the APGateway instance for quick chaining

**.responseTransformations( *transformations* )**

* *transformations* -> **Function[]**
	* If undefined the method will act as a getter, else it will set the value and return `this`.
	* Array of functions to transform the response object **after** it returns from the server
	```javascript
		gw.responseTransformations([
			// transformations must ALWAYS return "response" 
			// in order for the entire chain to work properly
			function(response) {...},
			function(response) {...}		
		]);
	```

Returns the current response transformations or the APGateway instance for quick chaining

**.addRequestTransformation( *transformation* )**

* *transformation* -> **Function**
	* Adds the transformation at the end of the request transformation chain

Returns the APGateway instance for quick chaining

**.addResponseTransformation( *transformation* )**

* *transformation* -> **Function**
	* Adds the transformation at the end of the response transformation chain

Returns the APGateway instance for quick chaining

**.execute()**

* Executes a request with the current configuration

Returns a Promise


##Development

If you would like to develop in the SDK you can just download the repository and do

```bash
npm install
```

Once that finishes, just use grunt to start the `watch` process

```bash
grunt
```