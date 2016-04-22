'use strict';

var _ = require('lodash'),
    errors = require('./errors'),
    PathNotFoundError = errors.PathNotFoundError,
    InvalidPathError = errors.InvalidPathError,
    TreeNotObjectError = errors.TreeNotObjectError,
    expressions = require('./expressions');

var evaluate, handleBranch, joinPaths, assertSubpathValid, splitPath, findDependencies, getAt, setAt;

/**
 * Builder for a Field in an Array Path
 * @param localName {String} name of the field.
 * @returns {{field: string}}
 */
var field = function(localName){
  return { field: localName };
};

/**
 * Builder for an Array Index in an Array Path
 * @param i {int} Index value
 * @returns {{index: int}}
 */
var arrayIndex = function(i){
  return { index: i }
};

/**
 * Get the property on the tree at the specified path.
 * @param tree {Object} object to perform the lookup.
 * @param arrayPath {Array} path to the leaf/branch on the tree to return.
 * @returns {*}
 * @throws {InvalidPathError}
 * @throws {PathNotFoundError}
 */
module.exports.getAt = getAt = function(tree, arrayPath){
  var sympath = joinPaths(arrayPath);
  if (!_.has(tree, sympath)) throw new PathNotFoundError(arrayPath, sympath);
  return _.get(tree, sympath);
};

/**
 * Set the leaf at the specified path.
 * @param tree {Object} tree with the leaf to set
 * @param arrayPath {Array} path to the leaf
 * @param value {*} value to set
 * @throws {InvalidPathError}
 * @throws {PathNotFoundError}
 */
module.exports.setAt = setAt = function(tree, arrayPath, value){
  var sympath = joinPaths(arrayPath);
  if (!_.has(tree, sympath)) throw new PathNotFoundError(arrayPath, sympath);
  _.set(tree, sympath, value);
};

/**
 * Ensure the subpath is valid.  If it is not, throw an exception.
 * @param paths {Array} Array Path
 * @param subpath {Object} Subpath within the Array path to validate.
 * @throws {InvalidPathError}
 */
module.exports.assertSubpathValid = assertSubpathValid = function(paths, subpath){
  if (!_.isObject(subpath)) throw new InvalidPathError(subpath);
  var keys = _.keys(subpath);
  if (keys.length > 1) throw new InvalidPathError(paths);
  if (['field', 'index'].indexOf(keys[0]) < 0) throw new InvalidPathError(paths);
};

/**
 * Join a path array into it's symbolic string representation.
 * @param paths {Array} Array Path
 * @returns {String} Symbolic Path
 * @throws {InvalidPathError}
 */
module.exports.joinPaths = joinPaths = function(paths){
  if (!_.isArray(paths)) throw new InvalidPathError(paths);
  assertSubpathValid(paths, paths[0]);
  var path = paths[0].field;
  _.tail(paths).forEach(function(subpath){
    assertSubpathValid(paths, subpath);
    if (subpath.field){
      path += '.' + subpath.field;
    }
    else {
      path += '[' + subpath.index + ']';
    }
  });
  return path;
};

/**
 * Split a symbolic string path.
 * @param path {String} Symbolic path
 * @returns {Array} Array path
 */
module.exports.splitPath = splitPath = function(path){
  var subpaths = path.split(/[.\[]/);
  return subpaths.map(function(s){
    if (s.indexOf(']') > 0) return { index: parseInt(s.replace(']', '')) };
    else return { field: s };
  });
};

/**
 * Pull dependent variables from the expression.
 * @param expression {Array} Expression sequence
 * @returns {Object} with properties consisting of 'symbolicPath': arrayPath
 */
module.exports.findDependencies = findDependencies = function(expression){
  return _.fromPairs(
            _.filter(expression, function(part){ return part.type === 'placeholder'; })
                .map(function(part){ return [part.value, splitPath(part.value) ]; })
         );
};

/**
 * Handle the branch, registering the necessary metadata to the context.
 * @param branch {*} the branch to evaluate.
 * @param prefix {Array} the prefix (path) of the branch from the root node.
 * @oaram context {Object} holds the metadata about the tree.
 * @param isRoot {Boolean} is this the root of the tree?
 */
module.exports.handleBranch = handleBranch = function(branch, prefix, context, isRoot){

  // We'll ignore everything on the root, but leave this defined to simplify the algorithm.
  var leaf = { path: prefix };

  // Only handle branches.  Therefore, if this is the root, ignore it.
  if (!isRoot){
    context.paths[ joinPaths(prefix) ] = leaf;
  }

  if (_.isString(branch)){
    try {
      var expression = expressions.parse(branch);
      if (expression.length === 1 && expression[0].type === 'content'){
        leaf.type = 'constant';
      }
      else {
        leaf.type = 'expression';
        leaf.expression = expression;
        leaf.dependencies = findDependencies(expression);
      }
    }
    catch (e){
      context.errors.push({
        branch: branch,
        path: prefix
      });
    }
  }
  else if (_.isArray(branch)) {
    leaf.type = 'branch';
    _.map(branch, function(leaf, i){ return handleBranch(leaf, prefix.concat(arrayIndex(i)), context, false); });
  }
  else if (_.isObject(branch)){
    leaf.type = 'branch';
    _.mapValues(branch, function(leaf, key){ return handleBranch(leaf, prefix.concat(field(key)), context, false); });
  }
  else {
    leaf.type = 'constant';
  }
};

/**
 * Evaluate the configuration object as a tree of values and expressions.
 * @param tree {Object} this is the object/tree to evaluate for configuration metadata.
 * @param prefix {String|Array} optionally, the path to the root node of this tree.
 */
module.exports.evaluate = evaluate = function(tree, prefix){
  if (_.isArray(tree) || !_.isObject(tree)) throw new TreeNotObjectError(tree);
  if (_.isString(prefix)) prefix = splitPath(prefix);
  var context = { errors: [], paths: {} };
  handleBranch(tree, prefix || [], context, true);
  return context;
};