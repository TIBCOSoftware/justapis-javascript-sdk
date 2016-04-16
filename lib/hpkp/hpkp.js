"use strict";

/**
 * Validates that the arguments passed are complete and of the correct type
 * Returns true if arguments valid, false otherwise
 * @param {Array} sha256s - an array of two sha256 encoded string keys
 * @param {number} maxAge
 * @param {boolean} includeSubdomains - optional
 * @param {boolean} reportOnly - optional, but if included there must be a valid reportUri argument
 * @param {string} reportUri - optional
 * @returns {boolean} - true if arguments are valid, false otherwise
 */
function validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(!sha256s ||  !(sha256s instanceof Array) || sha256s.length < 2) {
        return false;
    }
    if(!maxAge) {
        return false;
    }
    if(!!reportOnly && (!reportUri || typeof reportUri !== "string" || reportUri === "")) {
        return false;
    }
    return true;
}

/**
 * Returns the string name of the header to use in hpkp
 * @param {boolean} reportOnly - whether the mode is report-only
 * @returns {string} - the http header name for hpkp
 */
function headerName(reportOnly) {
    var name = "Public-Key-Pins";
    if(reportOnly) {
        name += "-Report-Only";
    }
    return name;
}

/**
 * Returns the value to send within the hpkp header
 * @param {Array} sha256s - an array of two sha256 encoded string representing the public key to pin (one of them is used as backup)
 * @param {number} maxAge - the maximum ammount of time, in seconds, that the public key pinning should be enforced by the browser
 * @param {boolean} includeSubdomains - optional, whether the pinning rule should apply to subdomains as well
 * @param {string} reportUri - optional, the URI string to send error reports to
 * @returns {string} - the full value to send in the hpkp header
 */
function headerValue(sha256s, maxAge, includeSubdomains, reportUri) {
    var values = [];
    for(var i=0 ; i < sha256s.length ; i++) {
        values.push('pin-sha256="' + sha256s[i] + '"');
    }

    values.push('max-age=' + Math.round(maxAge));

    if(!!includeSubdomains) {
        values.push('includeSubdomains');
    }

    if(reportUri) {
        values.push('report-uri="' + reportUri + '"');
    }

    return values.join('; ');
}

/**
 * Wrapper function for the entire module
 * @param {Array} sha256s - an array of two sha256 encoded string representing the public key to pin (one of them is used as backup)
 * @param {number} maxAge - the maximum ammount of time, in seconds, that the public key pinning should be enforced by the browser
 * @param {boolean} includeSubdomains - optional, whether the pinning rule should apply to subdomains as well
 * @param {boolean} reportOnly - wheter the mode is report-only
 * @param {string} reportUri - optional, the URI string to send error reports to
 * @return {object} - an object with one key/value which are the header name as key, and the header value as value
 */
module.exports = function hpkp(sha256s, maxAge, includeSubdomains, reportOnly, reportUri) {
    if(validateArguments(sha256s, maxAge, includeSubdomains, reportOnly, reportUri)) {
        var headerName = headerName(reportOnly);
        var headerValue = headerValue(sha256s, maxAge, includeSubdomains, reportUri);
        var header = {};
        header[headerName] = headerValue;
        return header;
    }
    return {};
};
