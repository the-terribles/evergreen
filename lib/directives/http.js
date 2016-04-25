'use strict';

var errors = require('../errors'),
    ContentLoader = require('./content-loader');

function HttpContentLoader(strategy){
  ContentLoader.call(this, strategy || 'http');
}

HttpContentLoader.prototype = Object.create(ContentLoader.prototype);
HttpContentLoader.prototype.constructor = HttpContentLoader;

/**
 * Load the content at the given path.
 * @param path {String} path
 * @param callback {Function}
 */
HttpContentLoader.prototype.load = function(path, callback){
  throw new errors.NotImplementedError('directive-http');
};


module.exports = HttpContentLoader;