'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    GraphBuilder = require('../lib/graph-builder');

describe('Graph Builder', function(){

  var TEST_TREE = {
    foo: 'bar',
    host: 'localhost',
    mysql: {
      port: 3306
    },
    pool: {
      driver: 'mysql',
      connection: 'mysql://{{host}}:{{mysql.port}}',
      instances: 10
    }
  };

  var TEST_LEAF_METADATA = {
    type: 'expression',
    dependencies: {
      'host': [ { field: 'host' }],
      'mysql.port': [ { field: 'mysql' }, { field: 'port' } ]
    },
    path: [ { field: 'pool' }, { field: 'connection' } ],
    expression: [
      { type: 'content', value: 'mysql://' },
      { type: 'placeholder', value: 'host' },
      { type: 'content', value: ':' },
      { type: 'placeholder', value: 'mysql.port' }
    ]
  };

  var TEST_METADATA = {
    errors: [],
    paths: {
      'foo':          { type: 'constant', path: [ { field: 'foo' } ] },
      'host':         { type: 'constant', path: [ { field: 'host' } ]  },
      'mysql':        { type: 'branch', path: [ { field: 'mysql' } ]  },
      'mysql.port':   { type: 'constant', path: [ { field: 'mysql' }, { field: 'port' } ]  },
      'pool':    { type: 'branch', path: [ { field: 'pool' } ]  },
      'pool.driver':  { type: 'constant', path: [ { field: 'pool' }, { field: 'driver' } ]  },
      'pool.connection': _.cloneDeep(TEST_LEAF_METADATA),
      'pool.instances': { type: 'constant', path: [ { field: 'pool' }, { field: 'instances' } ] }
    }
  };

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

      var leaf = _.cloneDeep(TEST_LEAF_METADATA),
          tree = _.cloneDeep(TEST_TREE),
          metadata = _.cloneDeep(TEST_METADATA);

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

      var tree = _.cloneDeep(TEST_TREE),
          metadata = _.cloneDeep(TEST_METADATA);

      var directive = GraphBuilder.resolve('pool.connection', tree, metadata);

      expect(tree.pool.connection).to.eq('mysql://localhost:3306');

      expect(directive).to.be.null;
    });

    it('should fill in expression placeholders from resolved dependencies', function(){

      var leaf = _.cloneDeep(TEST_LEAF_METADATA),
          tree = _.cloneDeep(TEST_TREE),
          metadata = _.cloneDeep(TEST_METADATA);

      var actual = GraphBuilder.fillPlaceholders(tree, metadata, leaf);

      expect(actual).to.deep.equal([
        { type: 'content', value: 'mysql://' },
        { type: 'content', value: 'localhost' },
        { type: 'content', value: ':' },
        { type: 'content', value: 3306 }
      ]);

    });

  });

});