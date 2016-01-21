"use strict";

var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

function APBrowserStorage() {
    if(typeof window.localStorage !== "undefined") {
        this.store = window.localStorage;
    } else {
        throw new Error("window.localStorage is required for APBrowserStorage.");
    }
}

extend(APBrowserStorage.prototype, {
    
   keysWithPrefix: function(prefix) {
       var results = [], pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results.push(key);
           }
       }
       return results;
   },
   
   findByPrefix: function(prefix) {
       var results = {}, pr = prefix + "::";
       for(var i=0 ; i<this.store.length ; i++) {
           var key = this.store.key(i);
           var start = key.slice(0, pr.length);
           if(start === pr) {
               results[key] = JSON.parse(this.store.getItem(key));
           }
       }
       return results;
   },
    
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.setItem(key, JSON.stringify(value));
            resolve();
       }));
   },
   
   get: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            var record = {}, item = JSON.parse(this.store.getItem(key));
            if(item !== null && item !== undefined && typeof item === "object") {
                record.timestamp = item.timestamp;
                record.value = item.value;
            }
            resolve(record);
       }));
   },
   
   getAll: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var result = {};
            if(typeof prefix === "string" && prefix !== "") {
                result = this.findByPrefix(prefix);
            }
            resolve(result);           
       }));
   },
   
   remove: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.removeItem(key);
            resolve(true);
       }));
   },
   
   flush: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var keys = this.keysWithPrefix(prefix);
            for(var i=0 ; i < keys.length ; i++) {
                this.remove(keys[i]);
            }
            resolve(true);
       }));
   }
});

module.exports = new APBrowserStorage();