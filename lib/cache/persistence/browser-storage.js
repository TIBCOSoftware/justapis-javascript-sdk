"use strict";

var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

/**
 * BrowserStorage class is a persistence strategy used by default when running in the browser
 * It uses localStorage internally to persist data
 * Since BrowserStorage is global to all Cache instances, it uses prefixes to multiplex the localStorage space
 * and keep the contents of each cache separate
 * @constructor
 */
function BrowserStorage() {
    if(typeof window.localStorage !== "undefined") {
        this.store = window.localStorage;
    } else {
        throw new Error("window.localStorage is required for BrowserStorage.");
    }
}

extend(BrowserStorage.prototype, {
   /**
    * Returns all the keys stored with the passed prefix prepended on each of them.
    * @method
    * @param {string} prefix - the prefix to prepend on each key
    * @returns {Array} - list of all keys
    */
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

   /**
    * Finds all keys belonging to a specific prefix
    * @method
    * @param {string} prefix
    * @returns {object} - all key/value pairs that belong to the prefix
    */
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

   /**
    * Sets a key/value pair
    * @method
    * @param {string} key
    * @param {any} value
    * @returns {Promise}
    */
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.setItem(key, JSON.stringify(value));
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
            var record = {}, item = JSON.parse(this.store.getItem(key));
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
            this.store.removeItem(key);
            resolve(true);
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

module.exports = new BrowserStorage();
