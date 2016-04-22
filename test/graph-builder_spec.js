'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    errors = require('../lib/errors'),
    GraphBuilder = require('../lib/graph-builder'),
    TEST_DATA = require('./data/graph-builder_tree'),
    TEST_DATA_WITH_DIRECTIVE = require('./data/graph-builder_tree-with-directive');

describe('Graph Builder', function(){

  it('should join expression content', function(){

    var expression = [
      { type: 'directive', value: '$ref' },
      { type: 'content', value: 'mysql://' },
      { type: 'content', value: 'localhost' },
      { type: 'content', value: ':' },
      { type: 'content', value: '3306' }
    ];

    expect(GraphBuilder.joinExpressionContent(expression)).to.eq('mysql://localhost:3306');

  });

  it('should retrieve directives from expressions', function(){

    var expression = [
      { type: 'directive', value: 'ref' },
      { type: 'content', value: 'foo.bar' }
    ];

    expect(GraphBuilder.getDirectiveFromExpression(expression)).to.eq('ref');

    expression = [
      { type: 'content', value: 'mysql://' },
      { type: 'content', value: 'localhost' },
      { type: 'content', value: ':' },
      { type: 'content', value: '3306' }
    ];

    expect(GraphBuilder.getDirectiveFromExpression(expression)).to.be.null;
  });

  describe('Dependency Resolution', function(){

    it('should determine if dependencies have been resolved for a leaf', function(){

      var unresolved = {
        'foo.bar': { metadata: { type: 'constant' } },
        'bar.foo': { metadata: { type: 'expression' } }
      };

      expect(GraphBuilder.allDependenciesAreResolved(unresolved)).to.be.false;

      var resolved = {
        'foo.bar': { metadata: { type: 'constant' } },
        'bar.foo': { metadata: { type: 'constant' } }
      };

      expect(GraphBuilder.allDependenciesAreResolved(resolved)).to.be.true;
    });

    it('should throw an error if the dependency refers to a branch', function(){

      expect(function(){

        GraphBuilder.allDependenciesAreResolved({
          'foo.bar': { metadata: { type: 'constant' } },
          'bar.foo': { metadata: { type: 'branch' } }
        });
      }).to.throw(errors.PlaceholderResolvesToBranchError);

    });

    it('should be able to build a dependency graph for a leaf', function(){

      var leaf = _.cloneDeep(TEST_DATA.leaf),
          tree = _.cloneDeep(TEST_DATA.tree),
          metadata = _.cloneDeep(TEST_DATA.metadata);

      var dependencies = GraphBuilder.buildDependenciesForLeaf(tree, metadata, leaf);

      expect(dependencies).to.deep.eq({
        'host': {
          value: 'localhost',
          metadata: { type: 'constant', path: [ { field: 'host' } ]  }
        },
        'mysql.port': {
          value: 3306,
          metadata: { type: 'constant', path: [ { field: 'mysql' }, { field: 'port' } ]  }
        }
      });

    });

    it ('should mark dependencies it cannot find in the tree as "unresolved"', function(){

      var tree = _.cloneDeep(TEST_DATA.tree),
          metadata = _.cloneDeep(TEST_DATA.metadata);

      var dependencies = GraphBuilder.buildDependenciesForLeaf(tree, metadata, {
        type: 'expression',
        dependencies: {
          'host': [ { field: 'host' }],
          'should.not.exist': [ { field: 'should' }, { field: 'not' }, { field: 'exist' } ]
        },
        path: [ { field: 'pool' }, { field: 'connection' } ]
      });

      expect(dependencies).to.deep.eq({
        'host': {
          value: 'localhost',
          metadata: { type: 'constant', path: [ { field: 'host' } ]  }
        },
        'should.not.exist': {
          metadata: { type: 'unresolved' }
        }
      });

    });

    it('should resolve dependencies for a leaf without a directive', function(){

      var tree = _.cloneDeep(TEST_DATA.tree),
          metadata = _.cloneDeep(TEST_DATA.metadata);

      var directive = GraphBuilder.resolve('pool.connection', tree, metadata);

      expect(tree.pool.connection).to.eq('mysql://localhost:3306');

      expect(directive).to.be.null;
    });

    it('should fill in expression placeholders from resolved dependencies', function(){

      var leaf = _.cloneDeep(TEST_DATA.leaf),
          tree = _.cloneDeep(TEST_DATA.tree),
          metadata = _.cloneDeep(TEST_DATA.metadata);

      var actual = GraphBuilder.fillPlaceholders(tree, metadata, leaf);

      expect(actual).to.deep.equal([
        { type: 'content', value: 'mysql://' },
        { type: 'content', value: 'localhost' },
        { type: 'content', value: ':' },
        { type: 'content', value: 3306 }
      ]);

    });
  });

  describe('Directives', function(){

    it('should process directives found in expressions', function(next){

      var stub = sinon.stub();

      var options = {
        directives: [
          {
            strategy: 'I',
            handle: stub
          }
        ]
      };

      stub.callsArgWith(3, null, {
        path: [ { field: 'pool' }, { field: 'connection' } ],
        value: 'mysql://localhost:3306',
        resolved: true,
        directive: 'I'
      });
      
      var tree = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.tree),
          metadata = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.metadata),
          graphBuilder = new GraphBuilder(options);

      var directiveContext = {
        strategy: 'I',
        context: 'mysql://localhost:3306',
        path: [ { field: 'pool' }, { field: 'connection' } ]
      };

      graphBuilder.processDirectives(tree, metadata, [directiveContext], function(err, outcome, unresolvedDirectives){

        expect(stub.called).to.be.true;

        expect(err).to.be.null;
        expect(outcome).to.eq(GraphBuilder.PassOutcomes.DIRECTIVES_PROCESSED);
        expect(unresolvedDirectives.length).to.eq(0);
        next();
      });
    });

    it('should requeue directives that could not be resolved during processing', function(next){

      var stub = sinon.stub();

      var options = {
        directives: [
          {
            strategy: 'I',
            handle: stub
          }
        ]
      };

      stub.callsArgWith(3, null, {
        path: [ { field: 'pool' }, { field: 'connection' } ],
        resolved: false,
        directive: 'I'
      });

      var tree = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.tree),
        metadata = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.metadata),
        graphBuilder = new GraphBuilder(options);

      var directiveContext = {
        strategy: 'I',
        context: 'mysql://localhost:3306',
        path: [ { field: 'pool' }, { field: 'connection' } ]
      };

      graphBuilder.processDirectives(tree, metadata, [directiveContext], function(err, outcome, unresolvedDirectives){

        expect(stub.called).to.be.true;

        expect(err).to.be.null;
        expect(outcome).to.eq(GraphBuilder.PassOutcomes.DIRECTIVES_PROCESSED);
        expect(unresolvedDirectives.length).to.eq(1);
        next();
      });
    });

    it('should terminate early if no directives need to be processed', function(next){

      var stub = sinon.stub();

      var options = {
        directives: [
          {
            strategy: 'I',
            handle: stub
          }
        ]
      };

      stub.callsArgWith(3, null, {
        path: [ { field: 'pool' }, { field: 'connection' } ],
        resolved: false,
        directive: 'I'
      });

      var tree = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.tree),
        metadata = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.metadata),
        graphBuilder = new GraphBuilder(options);


      graphBuilder.processDirectives(tree, metadata, [], function(err, outcome, unresolvedDirectives){

        expect(stub.called).to.be.false;

        expect(err).to.be.null;
        expect(outcome).to.eq(GraphBuilder.PassOutcomes.NO_DIRECTIVES_PROCESSED);
        expect(unresolvedDirectives.length).to.eq(0);
        next();
      });
    });

    it('should retrieve the correct handler by the directive key', function(){

      var shouldNotBeCalled = sinon.spy(),
          shouldBeCalled = sinon.spy(),
          delegateCallback = function(){};

      var options = {
        directives: [
          {
            strategy: 'handler1',
            handle: shouldNotBeCalled
          },
          {
            strategy: 'handler2',
            handle: shouldBeCalled
          }
        ]
      };

      var tree = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.tree),
          metadata = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.metadata),
          graphBuilder = new GraphBuilder(options),
          directive = { strategy: 'handler2', context: {}, path: [] };

      var handlerDelegate = graphBuilder.getDirectiveHandler(directive, tree, metadata);

      handlerDelegate(delegateCallback);

      expect(shouldNotBeCalled.called).to.be.false;
      expect(shouldBeCalled.calledWithExactly(directive, tree, metadata, delegateCallback)).to.be.true;
    });

    it('should throw an error if no suitable directive is found', function(next){

      var shouldNotBeCalled1 = sinon.spy(),
          shouldNotBeCalled2 = sinon.spy();

      var options = {
        directives: [
          {
            strategy: 'handler1',
            handle: shouldNotBeCalled1
          },
          {
            strategy: 'handler2',
            handle: shouldNotBeCalled2
          }
        ]
      };

      var tree = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.tree),
          metadata = _.cloneDeep(TEST_DATA_WITH_DIRECTIVE.metadata),
          graphBuilder = new GraphBuilder(options),
          directive = { strategy: 'handler3', context: {}, path: [] };

      var handlerDelegate = graphBuilder.getDirectiveHandler(directive, tree, metadata);

      handlerDelegate(function(err){
        expect(shouldNotBeCalled1.called).to.be.false;
        expect(shouldNotBeCalled2.called).to.be.false;
        expect(err).to.be.an.instanceOf(errors.DirectiveHandlerNotFoundError);
        next();
      });
    });
  });

  describe('Dependency Ordering', function(){

    it('should topologically sort dependencies to ensure the most expedient resolution of the graph', function(){

      var topo = GraphBuilder.buildDependencyGraph({
        paths: {
          'foo':          { type: 'constant', path: [ { field: 'foo' } ] },
          'host':         { type: 'constant', path: [ { field: 'host' } ]  },
          'hello.world': {
            type: 'expression',
            dependencies: {
              'some.other.leaf': [ { field: 'some' }, { field: 'other' }, { field: 'leaf' }]
            }
          },
          'dependency1': {
            type: 'expression',
            dependencies: {
              'host': [ { field: 'host' }]
            }
          },
          'some.other.leaf': {
            type: 'expression',
            dependencies: {
              'dependency1': [ { field: 'dependency1' }]
            }
          }
        }
      });

      expect(topo.nodes).to.deep.eq(['dependency1', 'some.other.leaf', 'hello.world']);
    });

    it('should throw an error if there is a cyclic dependency in the graph', function(){

      var metadata = {
        paths: {
          'foo':          { type: 'constant', path: [ { field: 'foo' } ] },
          'host':         { type: 'constant', path: [ { field: 'host' } ]  },
          'dependency1': {
            type: 'expression',
            dependencies: {
              'some.other.leaf': [ { field: 'some' }, { field: 'other' }, { field: 'leaf' }]
            }
          },
          'some.other.leaf': {
            type: 'expression',
            dependencies: {
              'dependency1': [ { field: 'dependency1' }]
            }
          }
        }
      };

      expect(function(){

        GraphBuilder.buildDependencyGraph(metadata);

      }).to.throw(Error);
    });
  });

  describe('Tree Processing', function(){

    it('should return an error if the dependencies are cyclic', function(next){

      var graphBuilder = new GraphBuilder();

      var tree = {
        "foo": "hello/{{bar}}",
        "bar": "hello/{{foo}}"
      };

      graphBuilder.processTree(tree, function(err){
        expect(err).to.be.an.instanceOf(errors.CannotBuildDependencyGraphError);
        next();
      });
    });

    it('should process a configuration tree rendering a configuration object', function(next){

      var graphBuilder = new GraphBuilder();

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}'
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.null;
        expect(config).to.deep.eq({
          foo: 'world',
          bar: 'hello world'
        });
        next();
      });
    });

    it('should handled nested dependencies when rendering the configuration object', function(next){

      var graphBuilder = new GraphBuilder();

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}',
        foobar: 'hello, hello, {{bar}}',
        branch: {
          leaf: 1234
        },
        yep: {
          nope: {
            huh: '{{foobar}} - {{branch.leaf}}'
          }
        }
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.null;
        expect(config).to.deep.eq({
          foo: 'world',
          bar: 'hello world',
          foobar: 'hello, hello, hello world',
          branch: {
            leaf: 1234
          },
          yep: {
            nope: {
              huh: 'hello, hello, hello world - 1234'
            }
          }
        });

        next();
      });
    });

    it('should resolve leafs using directives', function(next){

      var graphBuilder = new GraphBuilder({
        directives: [
          {
            strategy: 'eval',
            handle: function(directive, tree, metadata, callback){
              callback(null, {
                directive: directive,
                path: directive.path,
                resolved: true,
                value: eval(directive.context)
              })
            }
          }
        ]
      });

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}',
        foobar: 'hello, hello, {{bar}}',
        branch: {
          leaf: 1234
        },
        yep: {
          nope: {
            huh: '$eval::{{branch.leaf}} + 2'
          }
        }
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.null;
        expect(config).to.deep.eq({
          foo: 'world',
          bar: 'hello world',
          foobar: 'hello, hello, hello world',
          branch: {
            leaf: 1234
          },
          yep: {
            nope: {
              huh: 1236
            }
          }
        });

        next();
      });
    });

    it('should return an error if the graph has not been resolved and no more directives will be run', function(next){

      var graphBuilder = new GraphBuilder({
        directives: [
          {
            strategy: 'eval',
            handle: function(directive, tree, metadata, callback){
              callback(null, {
                directive: directive,
                path: directive.path,
                resolved: true,
                value: directive.context
              })
            }
          }
        ]
      });

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}',
        foobar: 'hello, hello, {{bar}}',
        branch: {
          leaf: 1234
        },
        yep: {
          nope: {
            huh: '$eval::{{some.other.leaf}} + 2'
          }
        }
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.an.instanceOf(errors.DependenciesNotResolvedError);
        next();
      });
    });

    it('should resolve placeholders returned from directives', function(next){

      var graphBuilder = new GraphBuilder({
        directives: [
          {
            strategy: 'confuser',
            handle: function(directive, tree, metadata, callback){
              callback(null, {
                directive: directive,
                path: directive.path,
                resolved: true,
                value: '{{foo}} ' + directive.context
              })
            }
          }
        ]
      });

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}',
        foobar: 'hello, hello, {{bar}}',
        branch: {
          leaf: 1234
        },
        yep: {
          nope: {
            huh: '$confuser::{{bar}}'
          }
        }
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.null;
        expect(config).to.deep.eq({
          foo: 'world',
          bar: 'hello world',
          foobar: 'hello, hello, hello world',
          branch: {
            leaf: 1234
          },
          yep: {
            nope: {
              huh: 'world hello world'
            }
          }
        });

        next();
      });
    });

    it('should fail if a placeholders returned from a directive cannot be resolved', function(next){

      var graphBuilder = new GraphBuilder({
        directives: [
          {
            strategy: 'confounder',
            handle: function(directive, tree, metadata, callback){
              callback(null, {
                directive: directive,
                path: directive.path,
                resolved: true,
                value: '{{yeah.baby}}'
              })
            }
          }
        ]
      });

      var tree = {
        foo: 'world',
        bar: 'hello {{foo}}',
        foobar: 'hello, hello, {{bar}}',
        branch: {
          leaf: 1234
        },
        yep: {
          nope: {
            huh: '$confounder::hey return something that will not resolve please!'
          }
        }
      };

      graphBuilder.processTree(tree, function(err, config){
        expect(err).to.be.an.instanceOf(errors.DependenciesNotResolvedError);
        next();
      });
    });
  });

});