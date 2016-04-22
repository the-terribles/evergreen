'use strict';

var treeUtils = require('../tree');

/**
 * Resolves leaves in the "<tree>.env" branch to environment variables (if they exist).
 * @param tree {Object} object graph.
 * @param sympath {String} symbolic path to resolve (e.g. 'foo.bar')
 * @param arrayPath {Array} array path to resolve (e.g. [ { field: 'foo' }, { field: 'bar' }])
 * @param branchSympath {String} sympath to branch in which the resolution began (not used)
 * @param branchArrayPath {Array} array path to branch in which the resolution began (not used)
 * @param __env {Object} used for testing.
 * @returns {*|null} Null means the property was not found.
 */
module.exports = function(tree, sympath, arrayPath, branchSympath, branchArrayPath, __env){
  __env = __env || process.env;
  if(arrayPath.length === 2
     && treeUtils.isNamedField(arrayPath[0], 'env')
     && treeUtils.isField(arrayPath[1])){

    if (__env.hasOwnProperty(arrayPath[1].field))
      try {
        // Environment properties are strings.  Try to parse it.
        return JSON.parse(__env[arrayPath[1].field]);
      }
      catch (e){
        return __env[arrayPath[1].field];
      }
  }
  return null;
};