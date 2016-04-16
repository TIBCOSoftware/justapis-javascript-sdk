"use strict";

/**
 * Interval function that fixes some shortcommings of the standard setInterval function
 * @param {function} func - the function to run on each iteration of the interval
 * @param {number} wait - the interval wait time in milliseconds
 * @param {number} times - the amount of repetitions
 * @param {boolean} immediate - should the function run immediately or be run after a wait
 */
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
