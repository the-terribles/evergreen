'use strict';

var util = require('util'),
    mime = require('mime'),
    EvUtils = require('../utils'),
    ContentLoader = require('./content-loader');

/**
 * Directive handler 'file'.
 *
 * Loads a file at the specified path (expression) and appends it to the tree at that position (replacing the current
 * value of the leaf).  Files can be absolutely 'pathed' or relative to the CWD (process.cwd).
 *
 * Content Type:
 *
 * This implementation will intelligently attempt to decipher the MIME type of the file.  If it is a text file or JSON,
 * the file will be converted from a Buffer to a String using the default encoding.  If the file is JavaScript, the
 * directive will attempt to "require" it.
 *
 * Preempting Type Handling:
 *
 * If you would rather not let the directive guess the content type, you can "hint" it's type by using query parameters:
 *
 * $file::./path/to/my/file?type=json
 * $file::./path/to/my/file?type=js
 * $file::./path/to/my/file.xml?type=text
 * $file::./path/to/my/file.pem?type=text
 *
 * Example:
 *
 * {
 *   hello: 'world',
 *   foo: '$file::./config/database.json'
 * }
 *
 * And with ./config/database.json looking something like this:
 *
 * {
 *   "pool": 4,
 *   "mysql": {
 *     "url": 'mysql:://localhost:3306/blah'
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
 */
function FileContentLoader(strategy){
  ContentLoader.call(this, strategy || 'file');
}

util.inherits(FileContentLoader, ContentLoader);

/**
 * Load the file at the given path.
 * @param path {String} path
 * @param callback {Function}
 */
FileContentLoader.prototype.load = function(path, callback){
  var me = this;
  EvUtils.readLocalFile(path, function(err, data){
    if (err) return callback(err);
    me.handleContent(path, mime.lookup(path), data, callback);
  });
};

/**
 * This is here largely to allow other implementations to override how th content is handled.
 * @param path {String} File Path
 * @param mimeType {String} MIME Type
 * @param data {Buffer} Data
 * @param callback {Function} Callback
 */
FileContentLoader.prototype.handleContent = function(path, mimeType, data, callback){
  callback(null, mimeType, data);
};

module.exports = FileContentLoader;