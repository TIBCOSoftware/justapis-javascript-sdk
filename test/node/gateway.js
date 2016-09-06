"use strict";

var mocha 			= require("mocha");
var chai			= require("chai");
var chaiAsPromised	= require("chai-as-promised");
var sinon			= require("sinon");

var PassThrough		= require("stream").PassThrough;
var http			= require("http");

var Es6Promise      = require("native-promise-only");
var Gateway		= require("../../index.js");

chai.use(chaiAsPromised);

var expect = chai.expect;
var should = chai.should();


describe("Gateway", function() {
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
        Gateway.RequestCache.flush();
		gateway = new Gateway();
		gateway
            .contentType("application/json")
            .cache(false);
	});

	afterEach(function() {
		http.request.restore();
	});

	describe('mqtt()', function () {
		it('should create an MQTT instance and connect over mqtt', function (done) {
			sinon.spy(gateway, 'mqtt');
			gateway.url('mqtt://broker.hivemq.com:1883/mqtt');
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
			this.timeout(20000);
			sinon.spy(gateway, 'mqtt');
			gateway.url('mqtt://broker.hivemq.com:1883/mqtt');
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
