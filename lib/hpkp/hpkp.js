"use strict";

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

function headerName(reportOnly) {
    var name = "Public-Key-Pins";
    if(reportOnly) {
        name += "-Report-Only";
    }
    return name;
}

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