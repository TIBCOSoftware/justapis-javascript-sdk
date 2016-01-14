"use strict";

function Interval(func, wait, times) {
    var timeout = null;
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
                timeout = setTimeout(interv, w);
            }
        };
    }(wait, times);
    
    this.cancel = function() {
        clearTimeout(timeout);
    };

    timeout = setTimeout(interv, wait);
    
}

module.exports = Interval;