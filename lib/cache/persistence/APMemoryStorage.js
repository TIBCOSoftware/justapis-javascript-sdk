var Es6Promise  = require("native-promise-only");
var extend      = require("../../utils/extend");
var bind        = require("../../utils/bind");

function APMemoryStorage() {
    this.store = {};
}

extend(APMemoryStorage.prototype, {
    
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
    
   set: function(key, value) {
       return new Es6Promise(bind(this, function(resolve) {
            this.store.setItem(key, JSON.stringify(value));
            resolve(true);
       }));
   },
   
   get: function(key) {
       return new Es6Promise(bind(this, function(resolve) {
            var record = {}, item = this.store[key];
            record.timestamp = item.timestamp;
            record.value = JSON.parse(item.value);
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
            if(this.store.hasOwnProperty(key)) {
                delete this.store[key];
                resolve(true);
            }
            resolve(false);
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

module.exports = new APMemoryStorage();