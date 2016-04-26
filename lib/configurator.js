'use strict';

var _ = require('lodash'),
    util = require('util'),
    EvUtils = require('./utils'),
    Path = require('path'),
    assert = require('assert'),
    Promise = require('bluebird'),
    GraphBuilder = require('./graph-builder'),
    EventEmitter = require('events');

 /**
 * Main interface for interacting with Evergreen.
 * @constructor
 */
function Configurator(){
  // Store reference to the tree/template
  this.__tree = {};
  // Cached instance of the fully rendered tree.
  this.__cachedResolvedTree = null;
  // Configuration for the GraphBuilder
  this.__config = {
   directives: {
     file: Path.resolve(__dirname, './directives/file.js'),
     http: Path.resolve(__dirname, './directives/http.js'),
     require: Path.resolve(__dirname, './directives/require.js')
   },
   resolvers: {
     absolute: {
       order: 1,
       resolve: Path.resolve(__dirname, './resolvers/absolute.js')
     },
     relative: {
       order: 2,
       resolve: Path.resolve(__dirname, './resolvers/relative.js')
     },
     environment: {
       order: 3,
       resolve: Path.resolve(__dirname, './resolvers/environment.js')
     }
   }
  };
}

/**
 * Represents the states of the configuration system as it runs through it's lifecycle.
 * @type {{ready: string, error: string}}
 */
Configurator.States = {
  /**
   * The Graph is being built.
   */
  Building: "building",
  /**
   * Configuration is available.
   */
  Ready: 'ready',
  /**
   * Configuration is in error.
   */
  Error: 'error'
};

util.inherits(Configurator, EventEmitter);

/**
 * Set for testing purposes.
 */
Configurator.prototype.__requireFile = require;

/**
 * Set for testing purposes.
 * @param err {*}
 * @private
 */
Configurator.prototype.__exit = function(err){
  console.error(err);
  process.exit(-1);
};

/**
 * Sort the resolvers and the ensure they are loaded (if string paths and not functions).
 * @returns {[{Function}]} sorted list of resolvers
 * @private
 */
Configurator.prototype.__orderAndLoadResolvers = function(){
  return _.sortBy(_.values(this.__config.resolvers), ['order', 'asc']).map(function(resolver){
    if (_.isString(resolver.resolve)) return require(resolver.resolve);
    return resolver.resolve;
  });
};

/**
 * Build the configuration for the GraphBuilder.
 * @returns {Object} configuration for GraphBuilder
 * @private
 */
Configurator.prototype.__buildConfiguration = function(){
  return {
    resolvers: this.__orderAndLoadResolvers(),
    directives: _.values(this.__config.directives)
  };
};

/**
 * Initiate the building of the object graph.
 * @private
 */
Configurator.prototype.__buildGraph = function(){

  var me = this;

  this.emit(Configurator.States.Building);

  var config = this.__buildConfiguration(),
      graphBuilder = new GraphBuilder(config);

  graphBuilder.build(this.__tree, function(err, finalizedGraph){
    if (err) return me.emit(Configurator.States.Error, err);
    me.__cachedResolvedTree = finalizedGraph;
    me.emit(Configurator.States.Ready, _.cloneDeep(finalizedGraph));
  });
};

/**
 * Get a copy of the configuration; this is a copy, and not the actual instance!  If the graph
 * has not been resolved/rendered, this method will throw an AssertionError.
 * @returns {Object}
 * @throws {AssertionError}
 */
Configurator.prototype.config = function(){
  assert.ok(EvUtils.isNonArrayObject(this.__cachedResolvedTree), 'Graph has not been rendered (did it error?).');
  return _.cloneDeep(this.__cachedResolvedTree);
};

/**
 * Is the configuration object ready (e.g. fully rendered)?
 * @returns {boolean} True if it is, false if not.
 */
Configurator.prototype.isReady = function(){
  return EvUtils.isNonArrayObject(this.__cachedResolvedTree);
};


/**
 * Add a resolver to the Configurator.
 * @param resolver { name: {String}, order: {int}, resolve: {Function} }
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.addResolver = function(resolver){
  assert.ok(EvUtils.isNonArrayObject(resolver), 'Resolvers must be an object; check documentation for signature.');
  assert.ok(_.isString(resolver.name), 'Resolvers must have a "name" property (e.g. "absolute" or "environment").');
  assert.ok(_.isInteger(resolver.order), 'Resolvers need an integer "order" property.');
  assert.ok(_.isFunction(resolver.resolve), 'Resolvers must have a "resolve" function.');

  this.__config.resolvers[resolver.name] = resolver;
};

/**
 * Remove a resolver from the Configurator.  Use this if you want to remove a resolver like "relative" which
 * may cause confusion (or may not work with your setup).  This is also a way to prune unwanted functionality
 * from 3rd party modules (after they have been registered/added).
 * @param name {String} name of the resolver to remove.
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.removeResolver = function(name){
  assert.ok(
    this.__config.resolvers.hasOwnProperty(name),
    util.format('No resolver with name "%s" is registered with Evergreen.', name));

  this.__config.resolvers[name] = undefined;
  delete this.__config.resolvers[name];

  return this;
};

/**
 * Add a Directive to the configurator.
 * @param directive {{ strategy: {String}, handle: {Function} }} Directive to register.
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.addDirective = function(directive){
  assert.ok(EvUtils.isNonArrayObject(directive), 'Directives must be an object; check documentation for signature.');
  assert.ok(_.isString(directive.strategy), 'Directives must have a "strategy" property (e.g. "http" or "mongo").');
  assert.ok(_.isFunction(directive.handle), 'Directives must have a "handle" function.');

  this.__config.directives[directive.strategy] = directive;

  return this;
};

/**
 * Remove a directive from the Configurator.  Use this to prune functionality you don't want from the core
 * project or any modules you've imported that may have added unwanted directives.
 * @param strategy {String} strategy name (e.g. 'file', 'require', etc.)
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.removeDirective = function(strategy){
  assert.ok(
    this.__config.directives.hasOwnProperty(strategy),
    util.format('No directive with strategy "%s" is registered with Evergreen.', strategy));

  this.__config.directives[strategy] = undefined;
  delete this.__config.directives[strategy];

  return this;
};

/**
 * Register a module (plugin) with the Configurator.
 * @param _module {{ resolvers: {Array}, directives: {Array} }} module to register.
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.addModule = function(_module){
  assert.ok(EvUtils.isNonArrayObject(_module),
            util.format('Module is not an object; got "%s" instead', typeof _module));
  
  if (_module.hasOwnProperty('resolvers')){

    assert.ok(
      _.isArray(_module.resolvers),
      util.format('Property "resolvers" on a module must be an array; got "%s" instead', typeof _module.resolvers));

    _module.resolvers.forEach(this.addResolver.bind(this));
  }

  if (_module.hasOwnProperty('directives')){

    assert.ok(
      _.isArray(_module.directives),
      util.format('Property "directives" on a module must be an array; got "%s" instead', typeof _module.directives));

    _module.directives.forEach(this.addDirective.bind(this));
  }

  return this;
};

/**
 * Register a list of modules with the Configurator
 * @param modules {Array} of Modules (objects)
 * @throws {AssertionError}
 * @returns {Configurator} this
 */
Configurator.prototype.addModules = function(modules){
  assert.ok(_.isArray(modules), 'You must supply an array of modules to the registerModules function.');
  modules.forEach(this.addModule.bind(this));
  return this;
};

/**
 * Render a configuration tree from a file (uses 'require' to import the tree).
 * @param file {String} path to file relative to the current working directory.
 * @returns {Configurator} this
 */
Configurator.prototype.renderFromFile = function(file){
  return this.render(require(Path.resolve(process.cwd(), file)));
};

/**
 * Render a configuration tree from an object.
 * @param tree {Object} template of the desired tree.
 * @returns {Configurator} this
 * @throws {AssertionError}
 */
Configurator.prototype.render = function(tree){
  assert.ok(EvUtils.isNonArrayObject(tree), util.format('Root configuration must be an object; got a "%s" instead.', typeof tree));
  var me = this;
  this.__tree = tree;
  process.nextTick(function(){
    try {
      me.__buildGraph();
    }
    catch (e){}
  });
  return this;
};

/**
 * Returns a Promise which will resolve when the configuration tree becomes available.
 * @returns {Promise} promise
 */
Configurator.prototype.and = function(){
  var once = this.once.bind(this);
  return new Promise(
    function(resolve, reject){
      once(Configurator.States.Ready, resolve);
      once(Configurator.States.Error, reject);
  });

};

/**
 * When the configuration is loaded, load the JavaScript file specified in the arguments.
 * @param jsEntryPoint {String} Path to JavaScript file.
 * @throws {*} Will throw an error if the configuration system encounters an error.
 */
Configurator.prototype.andRequire = function(jsEntryPoint){
  var me = this;
  this.once(Configurator.States.Ready, function(){
    me.__requireFile(jsEntryPoint);
  });
  this.once(Configurator.States.Error, function(err){
    me.__exit(err);
  });
};

module.exports = Configurator;