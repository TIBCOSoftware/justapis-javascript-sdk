/* global sinon */
/* global chai */
/* global chaiAsPromised */
/* global APGateway */
"use strict";

mocha.setup('bdd');
chai.use(chaiAsPromised);

var expect = chai.expect;
var should = chai.should();

/**
 * Fake Server Definition
 */
var fakeIdSeed = 1;
function initServer(server) {
	server.respondWith("GET", "/people", JSON.stringify([{ name: "John" }]));
	server.respondWith("POST", "/people", function(request) {
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
		server = sinon.fakeServer.create();
		initServer(server);
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
	
	it("should allow to get/set CORS flag", function() {
		gateway.crossDomain(true);
		expect(gateway.crossDomain()).to.be.true;
		gateway.crossDomain(false);
		expect(gateway.crossDomain()).to.be.false;
	});
	
	it("should be able to make copies of itself", function() {
		gateway
		.method("PATCH")
		.headers({ "Foo": "Bar" })
		.url("www.test.com")
		.crossDomain(true)
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
			.execute().should.eventually.satisfy(function(response) {
				return response.data[0].name === "John";
			})
			.and.notify(done);
			
		server.respond();
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
			
		server.respond();
	});
	
	it("should send PUT requests to the server", function(done) {
		gateway
			.url("/people/15")
			.method("PUT")
			.data({ name: "James", age: 34 })
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
		server.respond();
	});
	
	it("should send PATCH requests to the server", function(done) {
		gateway
			.url("/people/20")
			.method("PATCH")
			.data({ name: "Joan" })
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
		server.respond();
	});
	
	it("should send DELETE requests to the server", function(done) {
		gateway
			.url("/people/10")
			.method("DELETE")
			.execute().should.eventually.be.fulfilled.and.notify(done);
			
		server.respond();
	});
	
	it("should apply request/response transformations", function(done) {
		var encode = gateway.requestTransformations()[0];
		var decode = gateway.responseTransformations()[0];
		
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
				}
			])
			.execute().should.eventually.satisfy(function(response) {
				var data = response.data;
				return (data.HELLO === "WORLD!" && data.name === "Helen" && data.age === 90);
			})
			.and.notify(done);
		
		server.respond();
	});
	
});