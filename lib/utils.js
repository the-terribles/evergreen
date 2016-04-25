'use strict';

var fs = require('fs'),
    Path = require('path'),
    errors = require('./errors'),
    FileNotFoundError = errors.FileNotFoundError,
    NotAFileError = errors.NotAFileError,
    JSONParseError = errors.JSONParseError;

var asString;

/**
 * Read a file relative to the current working directory.
 * @param path {String} path to file relative to the CWD
 * @param callback {Function}
 */
module.exports.readLocalFile = function(path, callback){

  var filePath = Path.resolve(process.cwd(), path);

  fs.stat(filePath, function(err, stats){

    if (err) return callback(new FileNotFoundError(path));

    if (!stats.isFile()) return callback(new NotAFileError(path));

    fs.readFile(path, function(err, data){
      if (err) return callback(err);

      callback(null, data);
    });
  });
};

/**
 * Ensures the parameter, whether a string or buffer is returned as a string.
 * @param stringOrBuffer {String|Buffer}
 * @returns {String}
 */
module.exports.asString = asString = function(stringOrBuffer){
  if (stringOrBuffer instanceof Buffer) return stringOrBuffer.toString();
  return stringOrBuffer;
};

/**
 * Process content by type.
 * @param contentType {String} MIME Type String
 * @param data {Buffer} Buffer
 * @returns {String|Object|Buffer}
 */
module.exports.processContentByType = function(contentType, data){
  if (contentType.indexOf('text') === 0) return asString(data);
  if (contentType === 'application/json') {
    var string = asString(data);
    try {
      return JSON.parse(string);
    }
    catch (e){
      throw new JSONParseError(string);
    }
  }
  return data;
};