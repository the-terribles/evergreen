'use strict';

var NotImplementedError = require('../errors').NotImplementedError;

/**
 * Abstract class that coordinates the 
 * @param strategy
 * @constructor
 */
function ContentLoaderDirective(strategy){
  this.strategy = strategy;
}


ContentLoaderDirective.prototype.handle = function(context, tree, metadata, callback){
  this.load(context, function(err, content, noParse){
    
  });
};

/**
 * Subclasses need to implement this function.
 * @param context {DirectiveContext}
 * @param callback {Function} signature: function(err, *, boolean){}
 *                       Where:
 *                         err = error encountered loading the content.
 *                         * = returned content (of any type); if a string, the Loader will attempt to parse as JSON.
 *                         boolean = noParse - indicating that the response should not be parsed.
 */
ContentLoaderDirective.prototype.load = function(context, callback){
  callback(
    new NotImplementedError(
      this.strategy || '< LoaderDirective - strategy name not set >'));
};