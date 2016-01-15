"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var Interval        = require("../utils/Interval");
var APQueueMessage  = require("./APQueueMessage");

function APQueue() {
    this.active = true;
    this.messages = [];
    this.dequeueLoop = null;
    this.throttleDequeueBy = 300;
}

extend(APQueue.prototype, {
    
    queue: function(element, fn) {
        var message = new APQueueMessage(element);
        if(typeof fn === "function") {
            message.on("dispatch", fn);
        }
        
        this.messages.push(message);
        
        if(this.active && this.messages.length === 1) {
            this.dequeue();
        }
        
        return message;
    },
    
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
    
    pause: function() {
        this.active = false;
        return this;
    },
    
    resume: function() {
        this.active = true;
        this.dequeue();
        return this;
    },
    
    throttleBy: function(milliseconds) {
        if(typeof milliseconds === "number") {
            this.throttleDequeueBy = milliseconds;
        }
        return this;
    }
    
});

module.exports = APQueue;

