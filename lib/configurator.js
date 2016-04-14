'use strict';

var _ = require('lodash'),
    fs = require('fs'),
    util = require('util'),
    path = require('path'),
    async = require('async'),
    GraphBuilder = require('./graph-builder');

function Configurator(){
  // "_.noop" allows us to avoid the warning in "_notify".
  this.handlers = {
    load: [ _.noop ],
    change: [ _.noop ],
    error: [ _.noop ]
  };

  this.loaders = [];
}

Configurator.prototype.__handleError = function(err, message, callback){
  if (callback) callback(err, message);
  this._notify('error', [message, err]);
};

/**
 * Load a file as the root of the configuration.
 * @param file {String} path relative to the Current working directory.
 * @param callback
 */
Configurator.prototype.load = function(file, callback){
  var me = this;
  async.filter([ file, path.join(process.cwd(), file) ],
    function(filePath, callback){
      fs.access(filePath, function(err){
        callback(null, !err);
      });
    },
    function(err, results){
      if (err)
        return me.__handleError(err, util.format('An error occurred checking access to config file: %s', fullPath), callback);
      if (results.length === 0)
        return me.__handleError(new Error('File does not exist.'), util.format('Could not locate input file [%s].', fullPath), callback);

      try {
        var tree = require(results[0]);
        me.loadRoot(tree, callback);
      }
      catch (e){
        me.__handleError(e, util.format('Unable to load file [%s] as a valid JavaScript.', fullPath), callback);
      }
  });
};


Configurator.prototype.loadRoot = function (tree, callback) {

  this.root = tree;

  var me = this,
      graphBuilder = new GraphBuilder(this.loaders);

  graphBuilder.build(this.root, function(err, config){
    if (err) return me.__handleError(err, 'An error was encountered building the object graph.', callback);
    if (callback) callback(null, config);
    me._notify('load', [config]);
  });
};

Configurator.prototype._notify = function(event, params){
  if (this.handlers.hasOwnProperty(event) && this.handlers[event].length > 0){
    this.handlers[event].forEach(function(handler){ handler.apply(event, params); });
  }
  else {
    console.warn('No handlers have been registered for event "%s"', event);
  }
};

Configurator.prototype.on = function(event, handler){
  if (!_.isFunction(handler)) throw new Error('Supplied handler is not a function.');
  if (this.handlers.hasOwnProperty(event)) this.handlers[event].push(handler);
  else {
    console.warn('Registering handler for unknown event "%s"', event);
    this.handlers[event] = [ handler ];
  }
};

module.exports = Configurator;