'use strict';

var _ = require('lodash'),
    util = require('util'),
    async = require('async'),
    treeUtils = require('./tree'),
    Topo = require('topo');

var PassOutcomes = {
  FIRST_RUN: 0,
  DIRECTIVES_PROCESSED: 1,
  NO_DIRECTIVES_PROCESSED: 2
};

/**
 * Instantiate the GraphBuilder with the set of Directive Handlers.
 * @param directiveHandlers
 * @constructor
 */
function GraphBuilder(directiveHandlers){
  this.handlers = directiveHandlers;
}

/**
 * Are all dependencies of this leaf resolved?
 * @param dependencies {Object} Dependency subgraph
 * @returns {boolean} true if they are all resolved, false if not.
 */
GraphBuilder.allDependenciesAreResolved = function(dependencies){
  return _.every(_.mapValues(dependencies, function(dependency, sympath){
    if (dependency.metadata.type === 'branch')
      throw new Error(util.format('Placeholders cannot resolve to arrays or objects; offending path: %s', sympath));
    return dependency.metadata.type === 'constant';
  }));
};

/**
 * Join a leaf expression's content fields.
 * @param expression {Array} of expression parts
 * @returns {string} resulting content string joined.
 */
GraphBuilder.joinExpressionContent = function(expression){
  var contentNodes = _.filter(expression, function(part){ return part.type === 'content'; }),
      contentValues = _.map(contentNodes, 'value');
  return contentValues.join('');
};

/**
 * Builds a dependency subgraph used to resolve a particular expression leaf of the tree.
 * @param tree {Object} Configuration Tree
 * @param metadata {Object} Metadata about the tree
 * @param leafConfig {Object} Metadata for the Leaf
 * @returns {Object} A graph of dependencies, where the keys are the sympaths and the values are
 *                  the dependency metadata and actual value on the tree for that dependency.
 */
GraphBuilder.buildDependencyGraph = function(tree, metadata, leafConfig){
  return _.fromPairs(
    _.map(leafConfig.dependencies, function(sympath){
      var dependencyMetadata = metadata.paths[sympath];
      return [sympath, {
        value: treeUtils.getAt(tree, sympath),
        metadata: dependencyMetadata
      }];
    }));
};

/**
 * Attempt to resolve the placeholders.  If the Placeholders are fully resolved, but the
 * expression includes a directive, return the directive.
 * @param leaf {String} Symbolic path of the node.
 * @param tree {Object} config object that we are processing.
 * @param metadata {Object} metadata returned from evaluating the tree.
 * @return {Object|null} Directive or nothing.
 */
GraphBuilder.resolve = function(leaf, tree, metadata){

  var leafConfig  = metadata.paths[leaf],
      hasDirective = false;

  // Retreive the leaf/branch value and metadata about the dependencies
  var dependencies = GraphBuilder.buildDependencyGraph(tree, metadata, leafConfig);

  // Ensure all dependencies are resolved.
  if (!GraphBuilder.allDependenciesAreResolved(dependencies, metadata)) return null;

  leafConfig.expression = _.map(leafConfig.expression, function(p){
    if (p.type === 'placeholder'){
      // Replace the piece of the expression with a content entry.
      return {
        type: 'content',
        value: treeUtils.getAt(tree, metadata.paths[p.value])
      };
    }
    else if (p.type === 'directive') hasDirective = true;
    return p;
  });

  var content = GraphBuilder.joinExpressionContent(leafConfig.expression);

  if (hasDirective){
    return {
      strategy: _.find(leafConfig, function(p){ return p.type === 'directive'; }).value,
      context: content,
      path: leafConfig.path
    };
  }

  treeUtils.setAt(tree, leafConfig.path, content);
  return null;
};

/**
 * Build the Dependency Graph.
 * @param metadata {Object} Metadata, specifically the set of expressions that serve as dependencies
 * @returns {Topo} Hapi/Topo object.
 */
GraphBuilder.buildDependencyGraph = function(metadata){
  var topo = new Topo();

  // Pull all of the expressions out of the tree.  These will need to
  // be processed before we can continue.
  _.forOwn(metadata.paths, function(pathConfig, path){
    if (pathConfig.type === 'expression'){
      topo.add(path, { after: _.keys(pathConfig.dependencies) });
    }
  });

  return topo;
};

/**
 * Append the branch to the tree.
 * @param tree {Object}
 * @param branch {Object}
 */
GraphBuilder.appendToTree = function(tree, branch){



};

/**
 * Provides a task handler for resolving dependencies.
 * @param directive
 * @returns {Function}
 */
GraphBuilder.prototype.getDirectiveHandler = function(directive){
  var me = this;
  return function(next){
    var handler = _.find(me.handlers, function(h){
      return h.strategy === directive.strategy;
    });

    if (!handler) return next(new Error(util.format('No suitable directive handler found for %s', directive.strategy)));

    handler.handle(directive, next);
  };
};


/**
 * Multipass dependency tree processor.
 * @param tree
 * @param callback
 * @param lastPassOutcome {int} Outcome of the last pass processing the tree.
 *                              This helps us determine whether processing should continue.
 */
GraphBuilder.prototype.processTree = function(tree, callback, lastPassOutcome){

  var me = this,
      metadata = treeUtils.evaluate(tree),
      topo = GraphBuilder.buildDependencyGraph(metadata);

  // Check to see if the graph is fully resolved.
  if (topo.nodes.length === 0) {
    // It is fully resolved, so return the config
    return callback(null, tree);
  }
  // If we have dependencies and the last pass did not process any directives, there is no
  // possibility that this pass is going to resolve any more and complete the tree.
  else if (topo.nodes.length > 0 && lastPassOutcome === PassOutcomes.NO_DIRECTIVES_PROCESSED){
    return callback(new Error('Dependencies cannot be resolved: ' + topo.nodes.join(', ')));
  }

  var directives = [];

  try {
    topo.nodes.forEach(function(node){
      var directive = GraphBuilder.resolve(node, tree, md);
      if (directive) directives.push(directive);
    });
  }
  catch (e) {
    return callback(e);
  }

  async.parallel(_.map(directives, this.getDirectiveHandler.bind(this)), function(err, results){
    if (err) return callback(err);

    results.forEach(function(branch){
      GraphBuilder.appendToTree(tree, branch);
    });

    // Next pass.
    me.processTree(tree, callback);
  });
};

/**
 * Build the Graph
 * @param tree
 * @param callback
 */
GraphBuilder.prototype.build = function(tree, callback){
  this.processTree(_.cloneDeep(tree), callback, PassOutcomes.FIRST_RUN);
};

module.exports = GraphBuilder;