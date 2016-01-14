"use strict";

var mocha 			= require("mocha");
var chai			= require("chai");
var chaiAsPromised	= require("chai-as-promised");
var sinon			= require("sinon");
var APGateway		= require("../../index.js");
var Es6Promise      = require("native-promise-only");

chai.use(chaiAsPromised);

var expect = chai.expect;
var should = chai.should();

/**
 * Fake Server Definition
 */
var fakeIdSeed = 1;
function initServer(server) {
	server.respondWith("GET", /\/people/, JSON.stringify([{ name: "John" }]));
	server.respondWith("POST", /\/people/, function(request) {
		var data = JSON.parse(request.requestBody);
		if(data.name && data.age) {
			request.respond(201, {}, JSON.stringify({ id: fakeIdSeed++, name: data.name, age: data.age }));
		} else {
			request.respond(400, {}, "Bad Request");
		}
	});
	server.respondWith("PUT", /\/people\/(\d+)/, function(request, id) {
		var data = JSON.parse(request.requestBody);
		if(id && data.name && data.age) {
			request.respond(200, {}, "OK");
		} else {
			request.respond(400, {}, "Bad Request");
		}
	});
	server.respondWith("PATCH", /\/people\/(\d+)/, function(request, id) {
		var data = JSON.parse(request.requestBody);
		if(id && (data.name || data.age)) {
			request.respond(200, {}, "OK");
		} else {
			request.respond(400, {}, "Bad Request");
		}
	});
	server.respondWith("DELETE", /\/people\/(\d+)/, function(request, id) {
		if(id) {
			request.respond(204, {}, undefined);
		} else {
			request.respond(400, {}, "Bad Request");
		}
	});
}

describe("APGateway", function() {
	var server, gateway;
	beforeEach(function() {
		gateway = new APGateway();
		gateway.contentType("application/json");
        gateway.cache(false);
        
		server = sinon.fakeServer.create();
		initServer(server);
        server.respondImmediately = true;
	});
	
	afterEach(function() {
		server.restore();
	});
		
	it("should exist", function() {
		expect(APGateway).to.exist;
	});
	
	it("should act as a factory", function() {
		expect(gateway).to.be.an.instanceof(APGateway);
	});
	
	it("should act as a constructor", function() {
		expect(gateway).to.be.an.instanceof(APGateway);
	});
	
	it("should have default properties when created", function() {
		var gw = new APGateway();
		expect(gw.config).to.eql(APGateway.defaults);
	});
	
	it("should allow to get/set the url", function() {
		gateway.url("www.foo.com");
		expect(gateway.url()).to.equal("www.foo.com");
	});
	
	it("should allow to get/set the method", function() {
		gateway.method("PUT");
		expect(gateway.method()).to.equal("PUT");
	});
	
	it("should allow to get/set the contentType", function() {
		gateway.contentType("application/xml");
		expect(gateway.contentType()).to.equal("application/xml");
	});
	
	it("should allow to get/set data", function() {
		gateway.data({ foo: "bar" });
		expect(gateway.data()).to.eql({ foo: "bar" });
	});
	
	it("should allow to get/set headers", function() {
		gateway.headers({ "Test-Header": "Test-Header-Value" });
		expect(gateway.headers()).to.eql({ "Test-Header": "Test-Header-Value" });
		gateway.headers({ "Another-Header": "Another-Header-Value" });
		expect(gateway.headers()).to.eql({ "Test-Header": "Test-Header-Value", "Another-Header": "Another-Header-Value" });
	});
	
	it("should be able to make copies of itself", function() {
		gateway
		.method("PATCH")
		.headers({ "Foo": "Bar" })
		.url("www.test.com")
		.contentType("application/xml")
		.data({ foo: "bar" });
		
		var gw = gateway.copy();
		expect(gw).to.eql(gateway);
	});
	
	it("should allow to get/set request transformations", function() {
		var fn = function() { /* */ };
		gateway.requestTransformations([ fn ]);
		expect(gateway.requestTransformations()).to.eql([fn]);
	});
	
	it("should allow to add a request transformation", function() {
		var fn = function() { /* */ }, contains = false, tr;
		gateway.addRequestTransformation(fn);
		tr = gateway.requestTransformations();
		for(var i=0; i<tr.length && !contains; i++) {
			if(tr[i] === fn) {
				contains = true;
			}
		}
		expect(contains).to.be.true;
	});
	
	it("should allow to get/set response transformations", function() {
		var fn = function() { /* */ };
		gateway.responseTransformations([ fn ]);
		expect(gateway.responseTransformations()).to.eql([fn]);
	});
	
	it("should allow to add a response transformation", function() {
		var fn = function() { /* */ }, contains = false, tr;
		gateway.addResponseTransformation(fn);
		tr = gateway.responseTransformations();
		for(var i=0; i<tr.length && !contains; i++) {
			if(tr[i] === fn) {
				contains = true;
			}
		}
		expect(contains).to.be.true;
	});
	
	it("should send GET requests to the server", function(done) {
		gateway
			.url("/people")
			.execute()
			.should.eventually.satisfy(function(response) {
				return response.data[0].name === "John";
			})
			.and.notify(done);
			
	});
	
	it("should send POST requests to the server", function(done) {
		gateway
			.url("/people")
			.method("POST")
			.data({ name: "Paul", age: 29 })
			.execute().should.eventually.satisfy(function(response) {
				return response.data.id && response.data.name === "Paul";
			})
			.and.notify(done);
			
	});
	
	it("should send PUT requests to the server", function(done) {
		gateway
			.url("/people/15")
			.method("PUT")
			.data({ name: "James", age: 34 })
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
	});
	
	it("should send PATCH requests to the server", function(done) {
		gateway
			.url("/people/20")
			.method("PATCH")
			.data({ name: "Joan" })
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
	});
	
	it("should send DELETE requests to the server", function(done) {
		gateway
			.url("/people/10")
			.method("DELETE")
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
	});
	
	it("should apply request/response transformations", function(done) {
		var encode = gateway.requestTransformations()[0];
		var decode = gateway.responseTransformations()[0];
        var caching = gateway.responseTransformations()[1];
        
		gateway
			.url("/people")
			.method("POST")
			.data({ name: "Kelly", age: 41 })
			.requestTransformations([
				function(req) {
					req.data.name = "Helen";
					return req;
				},
				function(req) {
					req.data.age = 90;
					return req;	
				},
				encode
			])
			.responseTransformations([
				decode,
				function(res) {
					res.data.HELLO = "WORLD!";
					return res;
				},
                caching
			])
			.execute().should.eventually.satisfy(function(response) {
				var data = response.data;
				return (data.HELLO === "WORLD!" && data.name === "Helen" && data.age === 90);
			})
			.and.notify(done);
		
	});
    
    it("should cache GET requests", function(done) {
       gateway
            .cache(true)
            .method("GET")
            .url("/people")
            .data({ name: "Ron", age: 50 })
            .execute()
            .then(function(firstResponse) {
               server.restore();
               gateway.execute().then(function(secondResponse) {
                  delete firstResponse.parsers;
                  delete secondResponse.parsers;
                  firstResponse.statusCode.should.equal(secondResponse.statusCode);
                  firstResponse.data.should.eql(secondResponse.data);
                  firstResponse.headers.should.eql(secondResponse.headers);
                  gateway.cache(false);
                  done();
               });
            });
            
    });
    
    it("should queue requests", function(done) {
       server.respondImmediately = true;
       gateway.Queue.pause();
       APGateway.RequestCache.flush();
       
       gateway.cache(false).method("GET").url("/people");
       
       var promises = [
           gateway.execute(),
           gateway.execute(),
           gateway.execute(),
           gateway.execute(),
           gateway.execute(),
           gateway.execute()
       ];
       
       expect(gateway.Queue.messages.length).to.equal(6);
       
       gateway.Queue.throttleBy(100);
       
       Es6Promise.all(promises).then(function() {
           expect(gateway.Queue.messages.length).to.equal(0);
           done();
       });
       
       gateway.Queue.resume();
       
    });
	
});