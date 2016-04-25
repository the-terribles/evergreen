'use strict';

var _ = require('lodash'),
    EvUtils = require('../utils'),
    NotImplementedError = require('../errors').NotImplementedError;

/**
 * Abstract class that coordinates the loading of content from various sources (the source would come from
 * subclasses).
 * @param strategy {String} Name of the strategy
 * @constructor
 */
function ContentLoader(strategy){
  this.strategy = strategy;
}

/**
 * Handle the loading of the content from the source (context.expression).  If subclasses return a string
 * and the 'noParse' flag is not set to 'true' on the load() callback, this class will attempt to parse the content
 * as JSON.  If the parse fails, the content will remain a string.  Content, in whatever format, will be used to replace
 * the current value of the leaf at the target position.
 * @param context {DirectiveContext} path, expression, etc. related to the directive.
 * @param tree {Object} configuration tree/graph
 * @param metadata {Object} metadata about the tree
 * @param callback {Function} Callback with signature function(err, context){}.
 *                            Make sure you call context.resolve(*) to resolve the value at the leaf.
 */
ContentLoader.prototype.handle = function(context, tree, metadata, callback){
  this.load(context.expression, function(err, contentType, content){
    if (err) return callback(err);
    var parsedContent = null;
    try {
      parsedContent = EvUtils.processContentByType(contentType, content);
    }
    catch (e){
      return callback(e);
    }
    callback(null, context.resolve(parsedContent));
  });
};

/**
 * Subclasses need to implement this function.
 * @param expression {String} The content after the 'directive' in a leaf;
 *                       Example:
 *                         if the leaf was:
 *                           $file:./config/production.json
 *                         then the value of 'expression' would be:
 *                           ./config/production.json
 * @param callback {Function} signature: function(err, *, boolean){}
 *                       Where:
 *                         err = error encountered loading the content.
 *                         * = returned content (of any type); if a string, the Loader will attempt to parse as JSON.
 *                         boolean = noParse - indicating that the response should not be parsed.
 */
ContentLoader.prototype.load = function(expression, callback){
  callback(
    new NotImplementedError(
      this.strategy || '< LoaderDirective - strategy name not set >'));
};

module.exports = ContentLoader;