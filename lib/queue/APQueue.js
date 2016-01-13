"use strict";

var EventEmitter 	= require("tiny-emitter");
var extend      = require("../utils/extend");

function APQueue() {
    this.active = true;
    this.elements = [];
    this.type = undefined;
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
        }
        
        return this;
    },
    
    dequeue: function() {
        var element = undefined;
        if(this.active) {
            element = this.elements.shift();
            this.emit("dequeue", element);
        }
        return element;
    },
    
    validateElementIsOfType: function(type) {
        if(typeof type === "function") {
            this.type = type;
        }
        return this;
    },
    
    stop: function() {
        
    },
    
    resume: function() {
        
    }
    
});

module.exports = APQueue;

