'use strict';

var _ = require('lodash'),
    util = require('util'),
    async = require('async'),
    treeUtils = require('./tree'),
    Topo = require('topo');

/**
 * Instantiate the GraphBuilder with the set of Directive Handlers.
 *
 * Directive Handler:
 * {
 *   strategy: 'name',
 *   handle: function({ strategy: directiveName, context: contentAfterDirectiveName, path: leafConfig.path }, tree, metadata, callback){
 *    return callback(err, {
 *          path: leafConfig.path,
 *          value: *,
 *          resolved: true|false
 *          directive: first arg
 *        });
 * }
 *
 * @param options {Object}
 * @constructor
 */
function GraphBuilder(options){
  this.handlers = options.directives || [];
  this.maxPasses = options.maxPasses || 20;
}

/**
 * Enumeration representing the outcome of the last pass of processing the graph.
 */
GraphBuilder.PassOutcomes = {
  FIRST_RUN: 0,
  DIRECTIVES_PROCESSED: 1,
  NO_DIRECTIVES_PROCESSED: 2
};

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
GraphBuilder.buildDependenciesForLeaf = function(tree, metadata, leafConfig){
  return _.mapValues(leafConfig.dependencies, function(arrayPath, sympath){
    var dependencyMetadata = metadata.paths[sympath],
        value = treeUtils.getAt(tree, arrayPath);
    return {
      value: value,
      metadata: dependencyMetadata
    };
  });
};

/**
 * Pull the directive from the expression (if it exists).
 * @param expression {Array} Expression parts
 * @returns {string|null} Directive Name or Null if there is none
 */
GraphBuilder.getDirectiveFromExpression = function(expression){
  var directive = _.find(expression, function(p){ return p.type === 'directive'; });
  return (directive && directive.value)? directive.value.substring(1) : null;
};

/**
 * Fill in placeholders from values in the Tree, returning the collection.
 * @param tree {Object} Tree
 * @param metadata {Object} Tree Metadata
 * @param leafConfig {Object} Leaf Metadata
 * @returns {Array} Original Expression collection with placeholders filled in.
 */
GraphBuilder.fillPlaceholders = function(tree, metadata, leafConfig){
  return _.map(leafConfig.expression, function(p){
    if (p.type === 'placeholder'){
      var placeholderDependency = metadata.paths[p.value];
      // Replace the piece of the expression with a content entry.
      return {
        type: 'content',
        value: treeUtils.getAt(tree, placeholderDependency.path)
      };
    }
    return p;
  });
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
      directive = GraphBuilder.getDirectiveFromExpression(leafConfig.expression);

  // Retreive the leaf/branch value and metadata about the dependencies
  var dependencies = GraphBuilder.buildDependenciesForLeaf(tree, metadata, leafConfig);

  // Ensure all dependencies are resolved.
  if (!GraphBuilder.allDependenciesAreResolved(dependencies, metadata)) return null;

  // Convert placeholders to their actual value (from the tree).
  leafConfig.expression = GraphBuilder.fillPlaceholders(tree, metadata, leafConfig);

  var content = GraphBuilder.joinExpressionContent(leafConfig.expression);

  if (directive) return { strategy: directive, context: content, path: leafConfig.path };

  // This is not a directive, which means the leaf is fully satisfied at this point.
  // So let's replace the expression on the tree with the new content.
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
 * @param tree {Object} object graph
 * @param path {Array} array path
 * @param branch {*} whatever value needs to be placed at that location.
 */
GraphBuilder.appendToTree = function(tree, path, branch){
  treeUtils.setAt(tree, path, branch);
};

/**
 * Provides a task handler for resolving dependencies.
 * @param directive {Object} Directive
 * @param tree {Object} configuration graph
 * @param metadata {Object} tree metadata
 * @returns {Function}
 */
GraphBuilder.prototype.getDirectiveHandler = function(directive, tree, metadata){
  var me = this;
  return function(next){
    var handler = _.find(me.handlers, function(h){
      return h.strategy === directive.strategy;
    });

    if (!handler) return next(new Error(util.format('No suitable directive handler found for %s', directive.strategy)));

    handler.handle(directive, tree, metadata, next);
  };
};

/**
 * Process Directives found in the tree.
 * @param tree {Object} Configuration object to be manipulated
 * @param metadata {Object} tree metadata
 * @param directives {Array} Directives that were not resolved in the last pass.
 * @param callback {Function} Callback for when it's done
 */
GraphBuilder.prototype.processDirectives = function(tree, metadata, directives, callback){

  var me = this;

  if (directives.length === 0) return callback(null, GraphBuilder.PassOutcomes.NO_DIRECTIVES_PROCESSED, []);

  var unresolvedDirectives = [],
      tasks = _.map(directives, function(directive){ return me.getDirectiveHandler(directive, tree, metadata); });

  async.parallel(tasks, function(err, results){
    if (err) return callback(err);
    results.forEach(function(result){
      if (result.resolved) GraphBuilder.appendToTree(tree, result.path, result.value);
      else unresolvedDirectives.push(result.directive);
    });
    callback(null, GraphBuilder.PassOutcomes.DIRECTIVES_PROCESSED, unresolvedDirectives);
  });
};

/**
 * Multipass dependency tree processor.
 * @param tree {Object} Configuration object to be manipulated
 * @param callback {Function} Callback for when it's done
 * @param lastPassOutcome {int} Outcome of the last pass processing the tree.
 *                              This helps us determine whether processing should continue.
 * @param directives {Array} Directives that were not resolved in the last pass.
 * @param passes {int} Number of passes
 */
GraphBuilder.prototype.processTree = function(tree, callback, lastPassOutcome, directives, passes){

  directives = directives || [];
  passes = passes || 0;

  if (passes > this.maxPasses) callback(new Error(util.format('Maximum number of passes reached: %s', this.maxPasses)));

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
  else if (topo.nodes.length > 0 && lastPassOutcome === GraphBuilder.PassOutcomes.NO_DIRECTIVES_PROCESSED){
    return callback(new Error('Dependencies cannot be resolved: ' + topo.nodes.join(',')));
  }

  // Iterate over the dependencies, attempting to resolve each.
  try {
    topo.nodes.forEach(function(node){
      var directive = GraphBuilder.resolve(node, tree, md);
      if (directive) directives.push(directive);
    });
  }
  catch (e) {
    return callback(e);
  }

  this.processDirectives(tree, metadata, directives, function(err, outcome, unresolvedDirectives){
    if (err) return callback(err);
    me.processTree(tree, callback, outcome, unresolvedDirectives, ++passes);
  });
};

/**
 * Build the Graph
 * @param tree {Object} Configuration object to be manipulated
 * @param callback {Function} Callback for when it's done
 */
GraphBuilder.prototype.build = function(tree, callback){
  this.processTree(_.cloneDeep(tree), callback, GraphBuilder.PassOutcomes.FIRST_RUN);
};

module.exports = GraphBuilder;