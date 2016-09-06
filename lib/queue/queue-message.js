"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");

/**
 * Wraps an element in an EventEmitter
 * @constructor
 */
function QueueMessage(content) {
    this.content = content;
}

QueueMessage.prototype = new EventEmitter();
QueueMessage.prototype.constructor = QueueMessage;

module.exports = QueueMessage;
