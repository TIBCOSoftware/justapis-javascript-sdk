"use strict";

var Es6Promise	    = require("native-promise-only");
var extend          = require("../utils/extend");
var bind            = require("../utils/bind");
var defaultStorage  = require("./persistence/APMemoryStorage");

/**
 * Cache class, supports caching and expiration of key/value pairs (also persistence depending on the persistence strategy used)
 * @constructor
 * @param {string} prefix - A prefix used to identify a particular instance of APCache (depending on the underlaying persistence strategy it might not be needed)
 */
function APCache(prefix) {
    this.prefix = prefix;
    this.storage = APCache.defaults.storage;
    this.ttl = APCache.defaults.ttl;
    this.expirationCheck = APCache.defaults.expirationCheck;
}

/**
 * Default configuration for any APCache instance
 * @property {object} defaults
 */
APCache.defaults = {

   storage: defaultStorage,

   ttl: 604800000,

   expirationCheck: 600,

   /**
   * Sets a key/value into the cache
   * @param {any} key
   * @param {any} value
   * @returns {Promise}
   */
   set: function(key, value) {
       if(key !== undefined && key !== null && value !== undefined && value !== null) {
           var serialized = this.cacheKey(key);
           var fullValue = { value: value, timestamp: (new Date()).toJSON() };
           return this.storage.set(serialized, fullValue);
       }
       return Es6Promise.resolve(undefined);
   },

   /**
    * Retrieves a key from the cache by key
    * @param {any} key
    * @returns {Promise}
    */
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

   /**
    * Gets all key/value pairs saved in this cache
    * @returns {Promise}
    */
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

   /**
    * Removes a value from the cache by key
    * @param {any} key
    * @returns {Promise}
    */
   remove: function(key) {
       if(key !== undefined && key !== null) {
           var serialized = this.cacheKey(key);
           return this.storage.remove(serialized);
       }
       return Es6Promise.resolve(undefined);
   },

   /**
    * Checks if a key/value pair has gone stale based on the TTL specified in the configuration
    * @param {object} record - an object containing the value retrieved from the cache and its timestamp (added when setting it)
    * @returns {boolean} - true if the key/value is still valid, false otherwise
    */
   checkTTL: function(record) {
       var isAlive = false, now = new Date(), diff;
       if(record !== undefined && record !== null && record.timestamp) {
           var ts = new Date(record.timestamp);
           diff = Math.abs(ts - now);
           isAlive = diff < this.ttl;
       }
       return isAlive;
   },

   /**
    * Builds a string key
    * @param {any} key
    * @returns {string} - the built key
    */
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

   /**
    * Removes all entries from the cache
    */
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

   /**
    * Triggers an async cycle to remove keys that have expired
    * @returns {APCache}
    */
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

   /**
    * Stops the expiration checking cycle
    * @returns {APCache}
    */
   stopCleanupCycle: function() {
       if(this.cleanupCycle) {
           clearInterval(this.cleanupCycle);
       }
       return this;
   }
});


module.exports = APCache;
