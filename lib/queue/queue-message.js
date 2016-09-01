"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");

/**
 * Wraps an element in an EventEmitter
 * @constructor
 */
function APQueueMessage(content) {
    this.content = content;
}

APQueueMessage.prototype = new EventEmitter();
APQueueMessage.prototype.constructor = APQueueMessage;

module.exports = APQueueMessage;
