"use strict";

var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

/**
 * In-memory persistence strategy. This strategy is used by default when localStorage is not present (namely in a node env)
 * It has no persistence, but it tries to simulate the way localStorage works
 * Most methods return Promises because the persistence interface requires promises to be returned
 * This allows new persistence strategies to be added in the future (i.e. using a database like redis)
 * that uses async read/write operations seamlessly
 * @constructor
 */
function MemoryStorage() {
    this.store = {};
}

extend(MemoryStorage.prototype, {

    /**
     * Finds all keys belonging to a prefix
     * @method
     * @param {string} prefix
     * @returns {Array}
     */
    keysWithPrefix: function(prefix) {
       var results = [], pr = prefix + "::", start;
       for(var key in this.store) {
           if(this.store.hasOwnProperty(key)) {
                start = key.slice(0, pr.length);
                if(start === pr) {
                    results.push(key);
                }
           }
       }
       return results;
   },

   /**
    * Finds all keys belonging to a specific prefix
    * @method
    * @param {string} prefix
    * @returns {object} - all key/value pairs that belong to the prefix
    */
   findByPrefix: function(prefix) {
       var results = {}, pr = prefix + "::", start;
       for(var key in this.store) {
           if(this.store.hasOwnProperty(key)) {
                start = key.slice(0, pr.length);
                if(start === pr) {
                    results[key] = JSON.parse(this.store[key]);
                }
           }
       }
       return results;
   },

   /**
    * Sets a key/value pair
    * @method
    * @param {string} key
    * @param {any} value
    * @returns {Promise}
    */
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store[key] = value;
            resolve();
       }));
   },

   /**
    * Gets a value by key
    * @method
    * @param {string} key
    * @returns {Promise}
    */
   get: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            var record = {}, item = this.store[key];
            if(item !== null && item !== undefined && typeof item === "object") {
                record.timestamp = item.timestamp;
                record.value = item.value;
            }
            resolve(record);
       }));
   },

   /**
    * Gets all values by prefix. It uses findByPrefix internally.
    * @method
    * @param {string} prefix
    * @returns {Promise}
    */
   getAll: function(prefix) {
       return new Es6Promise(bind(this, function(resolve) {
            var result = {};
            if(typeof prefix === "string" && prefix !== "") {
                result = this.findByPrefix(prefix);
            }
            resolve(result);
       }));
   },

   /**
    * Removes a value by key
    * @method
    * @param {string} key
    * @returns {Promise}
    */
   remove: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            if(this.store.hasOwnProperty(key)) {
                delete this.store[key];
                resolve(true);
            }
            resolve(false);
       }));
   },

   /**
    * Removes all values belonging to a prefix
    * @method
    * @param {string} prefix
    * @returns {Promise}
    */
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

module.exports = new MemoryStorage();
