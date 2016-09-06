"use strict";

var mocha 			= require("mocha");
var chai			= require("chai");
var chaiAsPromised	= require("chai-as-promised");
var sinon			= require("sinon");
var Gateway		= require("../../index.js");
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

describe("Gateway", function() {
	var server, gateway;
	beforeEach(function() {
        Gateway.RequestCache.flush();
		gateway = new Gateway();
		gateway.contentType("application/json");
        gateway.cache(false);

		server = sinon.fakeServer.create();
		initServer(server);
        server.respondImmediately = true;
	});

	afterEach(function() {
		server.restore();
	});
	
  describe('mqtt()', function () {
		// TODO:  can't connect to public broker over wss without username/password
		// Need to identify a test strategy that works with WSS.  Mock server?
		/*
		it('should create an MQTT instance and connect over wss', function (done) {
			this.timeout(10000);
			sinon.spy(gateway, 'mqtt');
			gateway.url('wss://broker.hivemq.com:8000/mqtt');
			var client = gateway.mqtt();
			client.on('connect', function () {
				client.end();
				expect(gateway.mqtt.calledOnce).to.be.true;
				expect(gateway.mqtt.returnValues[0]).to.exist;
				expect(gateway.mqtt.threw()).to.be.false;
				gateway.mqtt.restore();
				done();
			});
		});
		*/
		it('should create an MQTT instance and connect over ws', function (done) {
			this.timeout(60000);
			sinon.spy(gateway, 'mqtt');
			gateway.url('ws://broker.hivemq.com:8000/mqtt');
			var client = gateway.mqtt();
			client.on('connect', function () {
				client.end();
				expect(gateway.mqtt.calledOnce).to.be.true;
				expect(gateway.mqtt.returnValues[0]).to.exist;
				expect(gateway.mqtt.threw()).to.be.false;
				gateway.mqtt.restore();
				done();
			});
		});
		it('should send and receive MQTT messages', function (done) {
			this.timeout(60000);
			sinon.spy(gateway, 'mqtt');
			gateway.url('ws://broker.hivemq.com:8000/mqtt');
			var client = gateway.mqtt();
			client.on('message', function (topic, message) {
			  // message is Buffer
			  expect(message.toString()).to.equal('Hello mqtt');
			  client.end();
				gateway.mqtt.restore();
				done();
			});
			client.on('connect', function () {
			  client.subscribe('gateway-mqtt');
			  client.publish('gateway-mqtt', 'Hello mqtt');
			});
		});
  });
});
