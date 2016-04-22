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

DependenciesNotResolvedError.prototype = Object.create(Error.prototype);
DependenciesNotResolvedError.prototype.constructor = DependenciesNotResolvedError;

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

DirectiveHandlerNotFoundError.prototype = Object.create(Error.prototype);
DirectiveHandlerNotFoundError.prototype.constructor = DirectiveHandlerNotFoundError;

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

PathNotFoundError.prototype = Object.create(Error.prototype);
PathNotFoundError.prototype.constructor = PathNotFoundError;

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

InvalidPathError.prototype = Object.create(Error.prototype);
InvalidPathError.prototype.constructor = InvalidPathError;

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

TreeNotObjectError.prototype = Object.create(Error.prototype);
TreeNotObjectError.prototype.constructor = TreeNotObjectError;

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

PlaceholderResolvesToBranchError.prototype = Object.create(Error.prototype);
PlaceholderResolvesToBranchError.prototype.constructor = PlaceholderResolvesToBranchError;

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

CannotBuildDependencyGraphError.prototype = Object.create(Error.prototype);
CannotBuildDependencyGraphError.prototype.constructor = CannotBuildDependencyGraphError;

exports.CannotBuildDependencyGraphError = CannotBuildDependencyGraphError;