/**
    * @module session/base62
    * @description
    * Contains functionality to encode/decode to/from Base62
    * // TODO: we need to add our own implementation. 
    * For now returning plain value
    *
    * Some other code from base62 can be found here:
    * https://github.com/andrew/base62.js/blob/master/base62.js
*/
'use strict';


// export to node js
module.exports = {

    encode: function(s){
        // TODO: we need to add our own implementation. For now returning plain value
        return s;
    },

    decode: function(base62String){
        // TODO: we need to add our own implementation. For now returning plain value
        return base62String;
    }

};

