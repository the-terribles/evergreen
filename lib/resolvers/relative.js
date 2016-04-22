'use strict';

var PathNotFoundError = require('../../lib/errors').PathNotFoundError,
    treeUtils = require('../../lib/tree');

/**
 * Resolves leaves relative to the branch.  If the leaf is not found, return null.  If the branch
 * does not exist, a PathNotFoundError will be thrown.
 * @param tree {Object} object graph.
 * @param targetSympath {String} symbolic path to resolve (e.g. 'foo.bar')
 * @param targetArrayPath {Array} array path to resolve (e.g. [ { field: 'foo' }, { field: 'bar' }])
 * @param branchSympath {String} sympath to branch in which the resolution began (not used)
 * @param branchArrayPath {Array} array path to branch in which the resolution began (not used)
 * @returns {*|null} Null means the property was not found.
 * @throws {PathNotFoundError}
 */
module.exports = function(tree, targetSympath, targetArrayPath, branchSympath, branchArrayPath){
  // Root path check
  if (branchArrayPath.length === 0) return null;
  // This will throw an error if the branch doesn't exist.
  // (which we want, because how would we have gotten to this point if it didn't exist?)
  var branch = treeUtils.getAt(tree, branchArrayPath);
  try {
    return treeUtils.getAt(branch, targetArrayPath);
  }
  catch (e){
    if (e instanceof PathNotFoundError) return null;
    throw e;
  }

};