"use strict";

function interval(func, wait, times){
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
                setTimeout(interv, w);
            }
        };
    }(wait, times);

    setTimeout(interv, wait);
};