'use strict';
const zlib = require('zlib');

// via https://github.com/danmactough/node-feedparser/blob/master/examples/compressed.js#L38-L46
module.exports = (res, encoding) => {
    let decompress;

    if (encoding.match(/\bdeflate\b/)) {
        decompress = zlib.createInflate();
    } else if (encoding.match(/\bgzip\b/)) {
        decompress = zlib.createGunzip();
    }

    return decompress ? res.pipe(decompress) : res;
};
