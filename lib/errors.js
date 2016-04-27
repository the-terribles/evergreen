'use strict';

var util = require('util');

/**
 * Really shitty way to call "super" on an error.
 * @param name {String} Name of the Error.
 * @param message {String} Message passed to Error.
 */
var superError = function(name, message){
  var error = Error.call(this, message);
  this.name = name;
  this.message = error.message;
  this.stack = error.stack;
};

/**
 * Dependencies in the Graph could not be resolved.
 * @param dependencies {Array} Dependencies that could not be resolved.
 * @constructor
 */
function DependenciesNotResolvedError(dependencies){
  superError.call(
    this,
    'DependenciesNotResolvedError',
    util.format('Dependencies cannot be resolved: %s', dependencies.join(','))
  );

  this.dependencies = dependencies;
}

util.inherits(DependenciesNotResolvedError, Error);

exports.DependenciesNotResolvedError = DependenciesNotResolvedError;

/**
 * Directive specified in the Graph does not have a matching handler.
 * @param strategy {String} The directive that could not be found.
 * @constructor
 */
function DirectiveHandlerNotFoundError(strategy){
  superError.call(
    this,
    'DirectiveHandlerNotFoundError',
    util.format('No suitable directive handler found for %s', strategy)
  );

  this.strategy = strategy;
}

util.inherits(DirectiveHandlerNotFoundError, Error);

exports.DirectiveHandlerNotFoundError = DirectiveHandlerNotFoundError;

/**
 * The Path does not exist in the tree.
 * @param path {Array} Path that was not found
 * @param sympath {String} Symbolic path representation.
 * @constructor
 */
function PathNotFoundError(path, sympath){
  superError.call(
    this,
    'PathNotFoundError',
    util.format('Path was not found in the tree: %s', sympath)
  );

  this.arrayPath = path;
  this.sympath = sympath;
}

util.inherits(PathNotFoundError, Error);

exports.PathNotFoundError = PathNotFoundError;

/**
 * The Path is invalid (doesn't conform to Array Path schema)
 * @param path {*} Whatever was used as a path
 * @constructor
 */
function InvalidPathError(path){
  superError.call(
    this,
    'InvalidPathError',
    util.format('Path does not follow the path format/syntax: %s', JSON.stringify(path))
  );

  this.invalidPath = path;
}

util.inherits(InvalidPathError, Error);

exports.InvalidPathError = InvalidPathError;

/**
 * Thrown if the tree is not an Object (e.g. an actual tree)
 * @param tree {*} Not an object
 * @constructor
 */
function TreeNotObjectError(tree){
  superError.call(
    this,
    'TreeNotObjectError',
    util.format('Trees must be objects; actual type: %s', typeof tree)
  );

  this.tree = tree;
}

util.inherits(TreeNotObjectError, Error);

exports.TreeNotObjectError = TreeNotObjectError;

/**
 * A placeholder resolved to either an object or array.
 * @param sympath {String} symbolic path of the branch.
 * @constructor
 */
function PlaceholderResolvesToBranchError(sympath){
  superError.call(
    this,
    'PlaceholderResolvesToBranchError',
    util.format('Placeholders cannot resolve to arrays or objects; offending path: %s', sympath)
  );

  this.sympath = sympath;
}

util.inherits(PlaceholderResolvesToBranchError, Error);

exports.PlaceholderResolvesToBranchError = PlaceholderResolvesToBranchError;

/**
 * Wraps errors returned from Topo representing a failure to build the dependency graph.
 * @param nestedError {Error} error encountered topo sorting the dependency graph.
 * @constructor
 */
function CannotBuildDependencyGraphError(nestedError){
  this.name = 'CannotBuildDependencyGraphError';
  this.message = nestedError.message;
  this.stack = nestedError.stack;

  this.nestedError = nestedError;
}

util.inherits(CannotBuildDependencyGraphError, Error);

exports.CannotBuildDependencyGraphError = CannotBuildDependencyGraphError;

/**
 * Error thrown by components that are not fully implemented.
 * @param component {String} name of the component not implemented
 * @constructor
 */
function NotImplementedError(component){
  superError.call(this, 'NotImplementedError', util.format('%s has not been implemented'));
}

util.inherits(NotImplementedError, Error);

exports.NotImplementedError = NotImplementedError;

/**
 * File was not found on the File System
 * @param file {String} path to the file does not exist.
 * @constructor
 */
function FileNotFoundError(file){
  superError.call(this, 'FileNotFoundError', util.format('"%s" was not found.', file))
  this.fsPath = file;
}

util.inherits(FileNotFoundError, Error);

exports.FileNotFoundError = FileNotFoundError;

/**
 * The path does not represent a file.
 * @param path {String} path to file system object
 * @constructor
 */
function NotAFileError(path){
  superError.call(this, 'NotAFileError', util.format('"%s" is not a file.', path))
  this.fsPath = path;
}

util.inherits(NotAFileError, Error);

exports.NotAFileError = NotAFileError;

/**
 * Indicates that the File provided is not a JavaScript file.
 * @param file {String} path to file
 * @constructor
 */
function NotAJavaScriptFileError(file){
  superError.call(this, 'NotAJavaScriptFileError', util.format('"%s" is not a JavaScript file.', file))
  this.fsPath = file;
}

util.inherits(NotAJavaScriptFileError, Error);

exports.NotAJavaScriptFileError = NotAJavaScriptFileError;

/**
 * Failed to Parse JSON String
 * @param json {String} JSON string
 * @constructor
 */
function JSONParseError(json){
  superError.call(this, 'JSONParseError', util.format('Source is not valid JSON: %s', json))
  this.json = json;
}

util.inherits(JSONParseError, Error);

exports.JSONParseError = JSONParseError;

/**
 * Failed to load the JavaScript file.
 * @param file {String} path to file
 * @param nestedError {Error} nested error from VM.
 * @constructor
 */
function JavaScriptFileLoadError(file, nestedError){
  nestedError = nestedError || null;

  var message = (nestedError)?
        util.format('"%s" failed to load as JavaScript; VM error: %s', file, nestedError.toString()) :
        util.format('"%s" failed to load as JavaScript.', file);

  superError.call(this, 'JavaScriptFileLoadError', message);

  this.fsPath = file;
  this.nestedError = nestedError;
}

util.inherits(JavaScriptFileLoadError, Error);

exports.JavaScriptFileLoadError = JavaScriptFileLoadError;

/**
 * Wraps an HTTP Request Error coming from an HTTP client library.
 * @param status {int} status code
 * @param body {String|Object} body of the response
 * @param nestedError {Error} error thrown by the client library.
 * @constructor
 */
function HttpRequestError(nestedError, status, body){

  nestedError = nestedError || null;
  status = status || -1;
  body = body || null;

  superError.call(
    this,
    'HttpRequestError',
    util.format('An error [%s] occurred requesting content from an HTTP source: %s', status, nestedError || body)
  );

  this.status = status;
  this.body = body;
  this.nestedError = nestedError;
}

util.inherits(HttpRequestError, Error);

exports.HttpRequestError = HttpRequestError;

/**
 * Thrown if errors occurred in parsing the tree.
 * @param errors {Array}
 * @constructor
 */
function CannotParseTreeError(errors){

  superError.call(
    this,
    'CannotParseTreeError',
    util.format('Could not parse the tree for metadata; errors: %s', JSON.stringify(errors))
  );

  this.errors = errors;
}

util.inherits(CannotParseTreeError, Error);

exports.CannotParseTreeError = CannotParseTreeError;
