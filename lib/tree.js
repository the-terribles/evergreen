'use strict';

var _ = require('lodash'),
    expressions = require('./expressions');

var evaluate, handleBranch;

var field = function(localName){
  return { field: localName };
};

var arrayIndex = function(i){
  return { index: i }
};

module.exports.handleBranch = handleBranch = function(branch, prefix, localPrefix, context){
  if (_.isString(branch)){
    try {

      var expression = expressions.parse(branch);

      if (expression.length === 1 && expression[0].type === 'content'){
        return expression[0].value;
      }

      context.pathsToProcess.push({ local: localPrefix, global: prefix });

      return {
        __type__: 'Expression',
        expression: expression
      };
    }
    catch (e){
      context.errors.push({
        branch: branch,
        path: {
          local: localPrefix,
          global: prefix
        }
      });
    }
  }
  else if (_.isArray(branch)) {
    return _.map(branch, function(leaf, i){
      return handleBranch(
              leaf,
              prefix.concat(arrayIndex(i)),
              localPrefix.concat(arrayIndex(i)),
              context
      );
    });
  }
  else if (_.isObject(branch)){
    return _.mapValues(branch, function(leaf, key){
      return handleBranch(
              leaf,
              prefix.concat(field(key)),
              localPrefix.concat(field(key)),
              context
      );
    });
  }
  return branch;
};

/**
 * Evaluate the configuration object as a tree of values and expressions.
 * @type {evaluate}
 */
module.exports.evaluate = evaluate = function(tree, rootPrefix){

  if (_.isString(rootPrefix)) rootPrefix = rootPrefix.split('.');

  rootPrefix = rootPrefix || [];

  var context = { errors: [], pathsToProcess: [] };

  context.evaluatedTree = handleBranch(tree, rootPrefix, [], context);

  return context;
};