#JustAPIs JavaScript SDK

##Overview

Lightweight JavaScript SDK to connect to a JustAPIs gateway through a web client.

##Dependencies

* [Native Promise Only](https://github.com/getify/native-promise-only)

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
silentFail: true,
dataType: "json",
contentType: "application/x-www-form-urlencoded; charset=UTF-8",
data: {},
headers: {},
parsers: {
	json: JSONParser,
	form: FormDataParser,
	xml: undefined // Coming soon...
},
transformations: {
	request: [ EncodeTransformation ],
	response: [ DecodeTransformation ]
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

Returns the current crossDomain value or the APGateway instance for quick chaining

**.silentFail( *silent* )**

When a request is not successful **APGateway** will throw an error. Setting *silentFail* to `true` will cause the gateway to ignore those errors.

* *silent* -> **boolean**
	* Default value: `true`
	* If *silent* is undefined the method will act as a getter, else it will set the value and return `this`.

Returns the current value of silentFail or the APGateway instance for quick chaining


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

##Framework integration

###React

The SDK will work with React.js out of the box since its plain JavaScript.

###Angular

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

###Ember

Like React or Angular, there is no restriction to use APGateway in an Ember application. If you're using Ember Data however you might want to integrate APGateway so you can load Models from it.

####Ember Data

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

##Development

If you would like to develop in the SDK you can just download the repository and do

```bash
npm install
```

Once that finishes, just use grunt to start the `watch` process

```bash
grunt
```