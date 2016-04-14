'use strict';

var _ = require('lodash'),
    expressions = require('./expressions');

var evaluate, handleBranch, joinPaths, splitPath, findDependencies, getAt, setAt;

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
 * @throws {Error} if the path is not valid.
 */
module.exports.getAt = getAt = function(tree, arrayPath){
  var sympath = joinPaths(arrayPath);
  if (!_.has(tree, sympath)) throw new Error('Path is not valid');
  return _.get(tree, sympath);
};

/**
 *
 * @type {setAt}
 */
module.exports.setAt = setAt = function(tree, arrayPath, value){
  if (!_.has(tree, joinPaths(arrayPath))) throw new Error('Path is not valid');
  _.set(tree, joinPaths(arrayPath), value);
};

/**
 * Join a path array into it's symbolic string representation.
 * @param paths {Array} Array Path
 * @returns {String} Symbolic Path
 */
module.exports.joinPaths = joinPaths = function(paths){
  var path = paths[0].field;
  _.tail(paths).forEach(function(subpath){
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
  if (!_.isObject(tree)) throw new Error("Trees must be objects.");
  if (_.isString(prefix)) prefix = splitPath(prefix);
  var context = { errors: [], paths: {} };
  handleBranch(tree, prefix || [], context, true);
  return context;
};