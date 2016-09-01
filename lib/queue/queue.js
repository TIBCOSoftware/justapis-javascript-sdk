"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var Interval        = require("../utils/interval");
var QueueMessage  = require("./queue-message");

/**
 * Asynchronous queue used to dispatch requests to an API
 * @constructor
 */
function APQueue() {
    this.active = true;
    this.messages = [];
    this.dequeueLoop = null;
    this.throttleDequeueBy = 300;
}

extend(APQueue.prototype, {

    /**
     * Adds an element to the queue
     * A callback can be passed which will be called when that element is dispatched from the queue
     * @method
     * @param {any} element - the element to queue
     * @param {function} fn - optional, callback to call when the element is dequeued
     * @returns {APQueueMessage}
     */
    queue: function(element, fn) {
        var message = new QueueMessage(element);
        if(typeof fn === "function") {
            message.on("dispatch", fn);
        }

        this.messages.push(message);

        if(this.active && this.messages.length === 1) {
            this.dequeue();
        }

        return message;
    },

    /**
     * Flushes the queue
     * Flushing is done using a async loop that will be throttled based on the config of APQueue
     * @method
     * @returns {APQueue}
     */
    dequeue: function() {
        if(this.dequeueLoop === null) {
            this.dequeueLoop = new Interval(bind(this, function() {
                if(this.active && this.messages.length > 0) {
                    var message = this.messages.shift();
                    message.emit("dispatch", message.content);
                } else {
                    this.dequeueLoop.cancel();
                    this.dequeueLoop = null;
                }
            }), this.throttleDequeueBy, undefined, true);
        }
        return this;
    },

    /**
     * Pauses the queue, in other words it blocks the dequeuing loop from running
     * @method
     * @returns {APQueue}
     */
    pause: function() {
        this.active = false;
        return this;
    },

    /**
     * Removes blocks on the dequeuing loop and restarts the loop
     * @method
     * @returns {APQueue}
     */
    resume: function() {
        this.active = true;
        this.dequeue();
        return this;
    },

    /**
     * Sets the time in milliseconds used to throttle the dequeuing loop
     * Throttling prevents an API to become flooded in situations when the queue has accumulated a lot of requests
     * @method
     * @param {number} milliseconds
     * @returns {APQueue}
     */
    throttleBy: function(milliseconds) {
        if(typeof milliseconds === "number") {
            this.throttleDequeueBy = milliseconds;
        }
        return this;
    },

    /**
     * Returns all of the elements in the queue
     * Its main purpose is to allow users to persist the contents of the queue to a database or localStorage if they choose to
     * The queue must be paused to be able to export because otherwise looping over its contents can be unsafe
     * @method
     * @returns {Array} - the contents of the queue
     * @throws {Error} - if the queue is not paused before exporting
     */
    export: function() {
        if(!this.active) {
            var len = this.messages.length;
            var messages = [];
            for(var i=0; i<len; i++) {
                messages.push(this.messages[i].content);
            }
        } else {
            throw new Error("APQueue must be paused to exportable");
        }
    }

});

module.exports = APQueue;
