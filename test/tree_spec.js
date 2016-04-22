'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    expect = chai.expect,
    errors = require('../lib/errors'),
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

      expect(function(){ return tree.getAt({ foo: 'bar' }, [ { field: 'nothere' } ]); }).to.throw(errors.PathNotFoundError);

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
      }).to.throw(errors.PathNotFoundError);

    });
    
    it('should thrown an error attempting to set an invalid path', function(){
      
      expect(function(){
        tree.setAt({ foo: 'bar' }, [ { honeybooboo: 'foo' }, { index: 1}, { field: 'b' } ], 'hello')
      }).to.throw(errors.InvalidPathError);

      expect(function(){
        tree.setAt({ foo: 'bar' }, [ 'saywhat?', { index: 1}, { field: 'b' } ], 'hello')
      }).to.throw(errors.InvalidPathError);

      expect(function(){
        tree.setAt({ foo: 'bar' }, 'honeybooboo say what?', 'hello')
      }).to.throw(errors.InvalidPathError);
    });

    it('should validate array subpath schema', function(){

      expect(function(){
        tree.assertSubpathValid([{}], {})
      }).to.throw(errors.InvalidPathError);

      expect(function(){
        tree.assertSubpathValid([{ field: 'blah', index: 0 }], { field: 'blah', index: 0 })
      }).to.throw(errors.InvalidPathError);

      expect(function(){
        tree.assertSubpathValid([{ huh: true }], { huh: true })
      }).to.throw(errors.InvalidPathError);

      expect(function(){
        tree.assertSubpathValid(['hello'], 'hello')
      }).to.throw(errors.InvalidPathError);
    });

    it('should determine if a subpath is a field', function(){

      expect(tree.isField()).to.be.false;

      expect(tree.isField({ field: 42 })).to.be.false;
      expect(tree.isField({ index: 12 })).to.be.false;
      expect(tree.isField({ field: true })).to.be.false;
      expect(tree.isField({ field: [] })).to.be.false;
      expect(tree.isField({ field: {} })).to.be.false;
      expect(tree.isField('blah')).to.be.false;

      expect(tree.isField({ field: 'hello' })).to.be.true;
    });

    it('should determine if a subpath is an array index', function(){

      expect(tree.isIndex()).to.be.false;
      expect(tree.isIndex({ field: 'hello' })).to.be.false;
      expect(tree.isIndex({ index: false })).to.be.false;
      expect(tree.isIndex({ index: '12' })).to.be.false;
      expect(tree.isIndex({ index: -1 })).to.be.false;
      expect(tree.isIndex({ index: 1.2 })).to.be.false;
      expect(tree.isIndex({ index: [] })).to.be.false;
      expect(tree.isIndex({ index: {} })).to.be.false;
      expect(tree.isIndex('blah')).to.be.false;

      expect(tree.isIndex({ index: 12 })).to.be.true;
    });

    it('should determine if a subpath is a field with the inquired name', function(){

      expect(tree.isNamedField({ field: 'hello' }, 'blah')).to.be.false;
      expect(tree.isNamedField({ index: 12 }, 'blah')).to.be.false;
      expect(tree.isNamedField('blah', 'blah')).to.be.false;
      expect(tree.isNamedField({ field: 'blah' }, 'blah')).to.be.true;

    });
  });

  it('throws an error if the supplied tree is not an object', function(){

    expect(function(){
      tree.evaluate(['hey', 'I', 'am', 'not', 'an', 'object'])
    }).to.throw(errors.TreeNotObjectError);

    expect(function(){
      tree.evaluate('neither am I')
    }).to.throw(errors.TreeNotObjectError);

    expect(function(){
      tree.evaluate(true)
    }).to.throw(errors.TreeNotObjectError);

    expect(function(){
      tree.evaluate(42)
    }).to.throw(errors.TreeNotObjectError);
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