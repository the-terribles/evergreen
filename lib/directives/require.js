'use strict';

var fs = require('fs'),
    vm = require('vm'),
    mime = require('mime'),
    errors = require('../errors'),
    NotAJavaScriptFileError = errors.NotAJavaScriptFileError,
    JavaScriptFileLoadError = errors.JavaScriptFileLoadError,
    FileContentLoader = require('./file');

/**
 * Requires a JavaScript file from disk.  The file must pass the MIME content test.  The JavaScript is executed in
 * an isolated sandbox (
 *
 * Example:
 *
 * {
 *   hello: 'world',
 *   foo: '$require::./config/database.js'
 * }
 *
 * And with ./config/database.js looking something like this:
 *
 * {
 *   pool: 4,
 *   mysql: {
 *     url: 'mysql:://localhost:3306/blah'
 *   }
 * }
 *
 * The tree will now look something like this:
 *
 * {
 *   hello: 'world',
 *   foo: {
 *     pool: 4,
 *     mysql: {
 *       url: 'mysql:://localhost:3306/blah'
 *     }
 *   }
 * }
 *
 * @constructor
 */
function RequireContentLoader(){
  FileContentLoader.call(this, 'require');
}

RequireContentLoader.prototype = Object.create(FileContentLoader.prototype);
RequireContentLoader.prototype.constructor = RequireContentLoader;

/**
 * Load the JavaScript file from the file the content.
 * @param path {String} Path to the file.
 * @param javascript {String} JavaScript as a String
 * @param callback {Function}
 */
RequireContentLoader.loadJavaScriptFile = function(path, javascript, callback){
  var scope = { module: { exports: {}}};
  try {
    vm.runInNewContext(javascript, scope, { timeout: 100 });
  }
  catch (e){
    return callback(new JavaScriptFileLoadError(path, e));
  }
  if (scope.module && scope.module.exports){
    return callback(null, scope.module.exports, true)
  }
  return callback(new JavaScriptFileLoadError(path));
};

/**
 * Check to see if this is a valid JavaScript file and then delegate the execution to loadJavaScriptFile.
 * @param path {String} File Path
 * @param data {Buffer} Data
 * @param callback {Function} Callback
 */
RequireContentLoader.prototype.handleContent = function(path, data, callback){

  var mimeType = mime.lookup(path);

  if (mimeType !== 'application/javascript') return callback(new NotAJavaScriptFileError(path));

  return RequireContentLoader.loadJavaScriptFile(path, data.toString(), callback);
};

module.exports = RequireContentLoader;