"use strict";

var Es6Promise	    = require("native-promise-only");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var defaultStorage  = require("./persistence/APMemoryStorage");

function APCache(prefix) {
    this.prefix = prefix;
    this.storage = APCache.defaults.storage;
    this.ttl = APCache.defaults.ttl;
    this.expirationCheck = APCache.defaults.expirationCheck;
}

APCache.defaults = {
   
   storage: defaultStorage,
   
   ttl: 604800000,
   
   expirationCheck: 600,
   
   set: function(key, value) {
       if(key !== undefined && key !== null && value !== undefined && value !== null) {
           var serialized = this.cacheKey(key);
           var fullValue = { value: value, timestamp: (new Date()).toJSON() };
           return this.storage.set(serialized, fullValue);
       }
       return Es6Promise.resolve(undefined);
   },
   
   get: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.get(serialized).then(bind(this, function(record) {
               var isAlive = this.checkTTL(record);
               return (isAlive) ? record.value : undefined;
           }));
       }
       return Es6Promise.resolve(undefined);
   },
   
   getAll: function() {
       return this.storage.getAll(this.prefix).then(bind(this, function(all) {
           var isAlive = true, pairs = {};
           for(var key in all) {
               if(all.hasOwnProperty(key)) {
                   isAlive = this.checkTTL(all[key]);
                   if(!isAlive) {
                       this.remove(key);
                       delete all[key];
                   } else {
                       pairs[key] = all[key].value;
                   }
               }
           }
           return all;
       }));
   },
   
   remove: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.remove(serialized);
       }
       return Es6Promise.resolve(undefined);
   },
   
   checkTTL: function(record) {
       var isAlive = false, now = new Date(), diff;
       if(record !== undefined && record !== null && record.timestamp) {
           var ts = new Date(record.timestamp);
           diff = Math.abs(ts - now);
           isAlive = diff < this.ttl;
       }
       return isAlive;
   },
   
   cacheKey: function(key) {
       var serialized = "", keyString = "";
       if(key !== undefined && key !== null) {
           if(typeof this.prefix === "string") {
               serialized += this.prefix + "::";
           }
           serialized += (typeof key !== "string") ? JSON.stringify(key) : key;
       }
       return serialized;
   },
   
   flush: function() {
       return this.storage.flush(this.prefix);
   }
};

extend(APCache.prototype, {
   set: APCache.defaults.set,
   get: APCache.defaults.get,
   getAll: APCache.defaults.getAll,
   remove: APCache.defaults.remove,
   checkTTL: APCache.defaults.checkTTL,
   cacheKey: APCache.defaults.cacheKey,
   flush: APCache.defaults.flush,
   
   startCleanupCycle: function() {
       this.cleanupCycle = setInterval(bind(this, function() {
           var isAlive = true;
           this.getAll().then(bind(this, function(allRecords) {
              for(var key in allRecords) {
                  if(allRecords.hasOwnProperty(key)) {
                      isAlive = this.checkTTL(allRecords[key]);
                      if(!isAlive) {
                          this.remove(key);
                      }
                  }
              } 
           }));
       }), this.expirationCheck*1000);
       return this;
   },
   
   stopCleanupCycle: function() {
       if(this.cleanupCycle) {
           clearInterval(this.cleanupCycle);
       }
       return this;
   }
});


module.exports = APCache;