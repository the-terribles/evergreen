'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
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
      { type: 'directive', value: '$ref' },
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
      }).to.throw(Error);

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

  });

});