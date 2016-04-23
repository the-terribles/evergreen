'use strict';

var treeUtils = require('./tree');

/**
 * Represent the context needed to resolve a directive.  This should be returned by the directive to the callback.
 * If the directive has resolved the value, there is a convenience method "resolve" you can call to set the value
 * and transition the completion state to "resolved".
 * @param strategy {String} name of the directive.
 * @param expression {String} the value after the directive in the expression
 * @param arrayPath {Array} path to the leaf in which the directive was declared.
 * @constructor
 */
function DirectiveContext(strategy, expression, arrayPath){
  this.resolved = false;
  this.strategy = strategy;
  this.expression = expression;
  this.path = arrayPath;
  this.sympath = treeUtils.joinPaths(arrayPath);
}

/**
 * Resolve the directive (notifying an update of the leaf) by setting the leaf value).
 * @param value {*} Value of the leaf.
 */
DirectiveContext.prototype.resolve = function(value){
  this.value = value;
  this.resolved = true;
  return this;
};

module.exports = DirectiveContext;