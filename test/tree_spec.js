'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    tree = require('../lib/tree');

describe('Tree Handler', function(){

  describe('Symbolic Paths', function(){

    it('can deconstruct a simple symbolic path into an array', function(){

      expect(tree.splitPath('foo.bar')).to.deep.equal([
        { field: 'foo' },
        { field: 'bar' }
      ]);

    });

    it('can deconstruct a symbolic path with array indexers into an array', function(){

      expect(tree.splitPath('foo.bar[42].hello')).to.deep.eq([
        { field: 'foo' },
        { field: 'bar' },
        { index: 42 },
        { field: 'hello' }
      ]);

    });

    it('can construct a simple symbolic path from an array', function(){

      var arrayPath = [
        { field: 'foo' }, { field: 'bar' }
      ];

      expect(tree.joinPaths(arrayPath)).to.eq('foo.bar');

    });

    it('can construct a symbolic path with array indexes from an array', function(){

      var arrayPath = [
        { field: 'foo' }, { field: 'bar' }, { index: 42 }, { field: 'hello' }
      ];

      expect(tree.joinPaths(arrayPath)).to.eq('foo.bar[42].hello');

    });

  });

  describe('Path Accessors and Mutators', function(){

    it('can get the value at a simple path', function(){

      var target = {
        foo: {
          bar: 11
        }
      };

      var actual = tree.getAt(target, [ { field: 'foo' }, { field: 'bar' } ]);

      expect(actual).to.eq(11);

    });

    it('can get the value at an array indexed path', function(){

      var target = {
        foo: {
          bar: [
            'a',
            { b: 42 }
          ]
        }
      };

      var actual = tree.getAt(target, [ { field: 'foo' }, { field: 'bar' }, { index: 1}, { field: 'b' } ]);

      expect(actual).to.eq(42);

    });

    it('should throw an error if the path is not on the tree', function(){

      expect(function(){ return tree.getAt({ foo: 'bar' }, [ { field: 'nothere' } ]); }).to.throw(Error);

    });

    it('can set the value of a simple path', function(){

      var target = {
        foo: {
          bar: 11
        }
      };

      tree.setAt(target, [ { field: 'foo' }, { field: 'bar' } ], 22);

      expect(target.foo.bar).to.eq(22);

    });

    it('can set the value of an array indexed path', function(){

      var target = {
        foo: {
          bar: [
            'a',
            { b: 42 }
          ]
        }
      };

      tree.setAt(target, [ { field: 'foo' }, { field: 'bar' }, { index: 1}, { field: 'b' } ], 'hello');

      expect(target.foo.bar[1].b).to.eq('hello');

    });

    it('should throw an error attempting to set a path that does not exist on the tree', function(){

      expect(function(){
        tree.setAt({ foo: 'bar' }, [ { field: 'foo' }, { field: 'bar' }, { index: 1}, { field: 'b' } ], 'hello')
      }).to.throw(Error);

    });

  });

  it('processes a deeply nested tree', function(){

    var config = {
      foo: 'bar',
      pool: {
        driver: 'mysql',
        connection: 'mysql://{{host}}:{{port}}',
        instances: 10
      }
    };

    var actual = tree.evaluate(config);

    expect(actual.errors).to.have.lengthOf(0);

    expect(actual.paths).to.deep.equal({
      'foo':     { type: 'constant', path: [ { field: 'foo' } ] },
      'pool':    { type: 'branch', path: [ { field: 'pool' } ]  },
      'pool.driver':  { type: 'constant', path: [ { field: 'pool' }, { field: 'driver' } ]  },
      'pool.connection': {
        type: 'expression',
        dependencies: {
          'host': [ { field: 'host' }],
          'port': [ { field: 'port' } ]
        },
        path: [ { field: 'pool' }, { field: 'connection' } ],
        expression: [
          { type: 'content', value: 'mysql://' },
          { type: 'placeholder', value: 'host' },
          { type: 'content', value: ':' },
          { type: 'placeholder', value: 'port' }
        ]
      },
      'pool.instances': { type: 'constant', path: [ { field: 'pool' }, { field: 'instances' } ] }
    });

  });

  it('processes arrays as using indexed placeholders', function() {

    var config = {
      foo: 'bar',
      array: [
        'mysql://{{host}}:{{port}}',
        {
          consul: 'http://localhost:8500?token={{consul.token}}'
        }
      ]
    };

    var actual = tree.evaluate(config);

    expect(actual.errors).to.have.lengthOf(0);

    expect(actual.paths).to.deep.equal({
      'foo':     { type: 'constant', path: [ { field: 'foo' } ] },
      'array':    { type: 'branch', path: [ { field: 'array' } ]  },
      'array[0]': {
        type: 'expression',
        dependencies: {
          'host': [ { field: 'host' }],
          'port': [ { field: 'port' } ]
        },
        path: [ { field: 'array' }, { index: 0 } ],
        expression: [
          { type: 'content', value: 'mysql://' },
          { type: 'placeholder', value: 'host' },
          { type: 'content', value: ':' },
          { type: 'placeholder', value: 'port' }
        ]
      },
      'array[1]': { type: 'branch', path: [ { field: 'array' }, { index: 1 } ] },
      'array[1].consul': {
        type: 'expression',
        dependencies: {
          'consul.token': [ { field: 'consul' }, { field: 'token' }]
        },
        path: [ { field: 'array' }, { index: 1 }, { field: 'consul' } ],
        expression: [
          { type: 'content', value: 'http://localhost:8500?token=' },
          { type: 'placeholder', value: 'consul.token' }
        ]
      }
    });
  });


});