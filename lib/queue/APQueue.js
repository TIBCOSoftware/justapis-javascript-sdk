"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");

function APQueue() {
    this.active = true;
    this.elements = [];
    this.type = undefined;
    this.dequeueLoop = null;
    this.throttleDequeueBy = 400;
}

APQueue.prototype = new EventEmitter();

extend(APQueue.prototype, {
    
    queue: function(element) {
        var shouldAddElement = true;
        if(this.type !== undefined && !(element instanceof this.type)) {
            shouldAddElement = false;
        }
        
        if(shouldAddElement) {
            this.elements.push(element);
            this.emit("queue", element);
            
            if(this.active && this.elements.length === 1) {
                this.dequeue();
            }
        }
        
        return this;
    },
    
    dequeue: function() {
        if(this.dequeueLoop === null) {
            this.dequeueLoop = setInterval(bind(this, function() {
                if(this.active && this.elements.length > 0) {
                    var element = this.elements.shift();
                    this.emit("dequeue", element);
                } else {
                    clearInterval(this.dequeueLoop);
                }
            }), this.throttleDequeueBy);
        }
        return this;
    },
    
    validateElementIsOfType: function(type) {
        if(typeof type === "function") {
            this.type = type;
        }
        return this;
    },
    
    stop: function() {
        this.active = false;
    },
    
    resume: function() {
        this.active = true;
        this.dequeue();
    },
    
    throttleBy: function(milliseconds) {
        if(typeof milliseconds === "number") {
            this.throttleDequeueBy = milliseconds;
        }
    }
    
});

module.exports = APQueue;

