"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");

function APQueueMessage(content) {
    this.content = content;
}

APQueueMessage.prototype = new EventEmitter();
APQueueMessage.prototype.constructor = APQueueMessage;

module.exports = APQueueMessage;