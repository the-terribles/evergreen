'use strict';

var PathNotFoundError = require('../../lib/errors').PathNotFoundError,
    treeUtils = require('../../lib/tree');

/**
 * Get the leaf at the specified path from the root of the tree.
 * @param tree {Object} object graph.
 * @param sympath {String} symbolic path to resolve (e.g. 'foo.bar')
 * @param arrayPath {Array} array path to resolve (e.g. [ { field: 'foo' }, { field: 'bar' }])
 * @returns {*|null} Null means the property was not found.
 */
module.exports = function(tree, sympath, arrayPath){
  try {
    return treeUtils.getAt(tree, arrayPath);
  }
  catch (e){
    if (e instanceof PathNotFoundError) return null;
    throw e;
  }
};