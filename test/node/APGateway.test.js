"use strict";

var mocha 			= require("mocha");
var chai			= require("chai");
var chaiAsPromised	= require("chai-as-promised");
var sinon			= require("sinon");

var PassThrough		= require("stream").PassThrough;
var http			= require("http");

var Es6Promise      = require("native-promise-only");
var APGateway		= require("../../index.js");

chai.use(chaiAsPromised);

var expect = chai.expect;
var should = chai.should();


describe("APGateway", function() {
	var gateway, $request, $write;
	
	/**
	 * Helpers
	 */
	function expectation(expectedResponse) {
		var response = new PassThrough();
		response.write(JSON.stringify(expectedResponse));
		response.end();
	
		var request = new PassThrough();
		$write = sinon.spy(request, 'write');
	
		$request.callsArgWith(1, response).returns(request);
	}
    
    function multipleExpectation(expectedResponses) {
        var request = new PassThrough();
		
        $write = sinon.spy(request, 'write');
        
        for(var i=0 ; i<expectedResponses.length ; i++) {
            var response = new PassThrough();
            response.write(JSON.stringify(expectedResponses[i]));
            response.end();
		    $request.onCall(i).callsArgWith(1, response).returns(request);
        }
	        
    }
	/**
	 * End Helpers
	 */
	
	
	beforeEach(function() {
		$request = sinon.stub(http, 'request');
        APGateway.RequestCache.flush();
		gateway = new APGateway();
		gateway
            .contentType("application/json")
            .cache(false);
	});
	
	afterEach(function() {
		http.request.restore();
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
		expectation([{ name: "John" }]);
		gateway
			.url("/people")
			.execute().should.eventually.satisfy(function(response) {
				return response.data[0].name === "John";
			})
			.and.notify(done);
	});
	
	it("should send POST requests to the server", function(done) {
		var data = { name: "Paul", age: 29 };
		expectation({ id: 7, name: data.name, age: data.age });
		
		gateway
			.url("/people")
			.method("POST")
			.data(data)
			.execute().should.eventually.satisfy(function(response) {
				expect($write.withArgs(JSON.stringify(data)).calledOnce);
				return response.data.id && response.data.name === "Paul";
			})
			.and.notify(done);
	});
	
	it("should send PUT requests to the server", function(done) {
		var data = { name: "James", age: 34 };
		expectation("OK");
		
		gateway
			.url("/people/15")
			.method("PUT")
			.data(data)
			.execute().should.eventually.satisfy(function(response) {
				expect($write.withArgs(JSON.stringify(data)).calledOnce);
				return response.data === "OK";
			})
			.and.notify(done);
	});
	
	it("should send PATCH requests to the server", function(done) {
		var data = { name: "Joan" };
		expectation("OK");
		gateway
			.url("/people/20")
			.method("PATCH")
			.data({ name: "Joan" })
			.execute().should.eventually.satisfy(function(response) {
				expect($write.withArgs(JSON.stringify(data)).calledOnce);
				return response.data === "OK";
			})
			.and.notify(done);
	});
	
	it("should send DELETE requests to the server", function(done) {
		expectation("OK");
		gateway
			.url("/people/10")
			.method("DELETE")
			.execute().should.eventually.be.fulfilled.and.notify(done);
	});
	
	it("should apply request/response transformations", function(done) {
		var ex = { name: "Helen", age: 90 };
		expectation(ex);
		
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
				expect($write.withArgs(JSON.stringify(ex)).calledOnce);
				return (data.HELLO === "WORLD!" && data.name === "Helen" && data.age === 90);
			})
			.and.notify(done);
	});
    
    it("should cache GET requests", function(done) {
       expectation({ foo: "bar" });
       gateway
            .cache(true)
            .method("GET")
            .url("http://www.example.com/some/test/route")
            .data({ name: "Ron", age: 50 })
            .execute()
            .then(function(firstResponse) {
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
       APGateway.Queue.pause();
       APGateway.RequestCache.flush();
       
       gateway.cache(false).method("GET").url("/people");
       
       expectation({ foo: "bar" });
       
       var promises = [];
       for(var i=0 ; i<6 ; i++) {
           promises.push(gateway.execute());
       }
       
       expect(APGateway.Queue.messages.length).to.equal(6);
       
       APGateway.Queue.resume();
       done();
    });
	
});