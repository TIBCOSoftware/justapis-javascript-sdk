
var extend = require("../utils/extend");
var defaultStorage = require("./persistence/APMemoryStorage");

function APCache(prefix) {
    this.prefix = prefix;
    this.storage = APCache.defaults.storage;
}

APCache.defaults = {
   
   storage: defaultStorage,
   
   ttl: 604800000,
   
   expirationCheck: 600,
   
   set: function(key, value) {
       if(key !== undefined && key !== null && value !== undefined && value !== null) {
           var serialized = this.cacheKey(key);
           var fullValue = { value: value, timestamp: (new Date()).toJSON() };
           this.storage.set(serialized, fullValue);
       }
       return this;
   },
   
   get: function(key) {
       var value = undefined;
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           value = this.storage.get(serialized);
       }
       return value;
   },
   
   getAll: function() {
       
   },
   
   remove: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           this.storage.remove(serialized);
       }
       return this;
   },
   
   checkTTL: function(key) {
       var isAlive = true, now = new Date(), diff;
       if(key != undefined && key !== null) {
           var value = this.get(key);
           if(value !== undefined && value !== null && typeof value === "object") {
               var ts = new Date(value.timestamp);
               diff = Math.abs(ts - now);
               isAlive = diff < this.ttl;
           }
       }
       return isAlive;
   },
   
   cacheKey: function(key) {
       var serialized = "";
       if(key !== undefined && key !== null) {
           if(typeof this.prefix === "string") {
               serialized += this.prefix + "::";
           }
           serialized += JSON.stringify(key);
       }
       return serialized;
   }
};

extend(APCache.prototype, {
   set: APCache.defaults.set,
   get: APCache.defaults.get,
   getAll: APCache.defaults.getAll,
   remove: APCache.defaults.remove,
   checkTTL: APCache.defaults.checkTTL,
   cacheKey: APCache.defaults.cacheKey  
});


module.exports = APCache;