"use strict";

function Interval(func, wait, times, immediate) {
    this.timeout = null;
    this.canceled = false;
    var self = this;
    
    var interv = function(w, t){
        return function(){
            if(typeof t === "undefined" || t-- > 0){
                try{
                    func.call(null);
                }
                catch(e){
                    t = 0;
                    throw e.toString();
                }
                if(!self.canceled) {
                    self.timeout = setTimeout(interv, w);
                }
            }
        };
    }(wait, times);
    
    this.cancel = function() {
        this.canceled = true;
        clearTimeout(this.timeout);
    };
    
    this.timeout = setTimeout(interv, wait);
    
    if(!!immediate) {
        interv();
    } else {
        this.timeout = setTimeout(interv, wait);
    } 

    
}

module.exports = Interval;