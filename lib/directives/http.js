'use strict';

var util = require('util'),
    errors = require('../errors'),
    HttpRequestError = errors.HttpRequestError,
    request = require('request'),
    ContentLoader = require('./content-loader');

/**
 * Directive handler 'http'.
 *
 * This is a really simplistic version of an HTTP content sourcer.  I fully plan to make this more robust in the
 * future and to add HTTPS support.  Currently it will parse JSON, convert any content with content-type starting with
 * 'text' to a string, but everything else will be returned as a Buffer.
 *
 * @param strategy {String|null}
 * @constructor
 */
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
  request({ url: util.format('%s:%s', this.strategy, path), encoding: null }, function(err, response, body){
    if (err || response.statusCode !== 200)
      return callback(new HttpRequestError(err, (response)? response.statusCode : null, body));
    callback(null, HttpContentLoader.parseResponse(response, body));
  });
};

/**
 * Handle the response body, parsing if it is JSON.
 * @param response {Object}
 * @param body {String|Buffer}
 * @returns {*}
 */
HttpContentLoader.parseResponse = function(response, body){
  var contentType = response.headers['content-type'];
  if (contentType.indexOf('text') === 0) return body.toString();
  if (contentType === 'application/json') return JSON.parse(body.toString());
  return body;
};

module.exports = HttpContentLoader;