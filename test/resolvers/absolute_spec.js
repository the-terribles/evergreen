'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  expect = chai.expect,
  errors = require('../../lib/errors'),
  resolve = require('../../lib/resolvers/absolute');

describe('Resolvers', function(){

  describe('Absolute', function(){

    var tree = {
      foo: {
        bar: {
          hello: 'world'
        }
      },
      meaning: {
        of: {
          life: [42]
        }
      }
    };

    it('returns null if the path does not exist at the root of the tree', function(){

      expect(resolve(tree, 'foo.bar.hello', [{ field: 'bar' }, { field: 'hello' }])).to.be.null;
      expect(resolve(tree, 'honey.boo.boo', [{ field: 'honey' }, { field: 'boo' }, { field: 'boo' }])).to.be.null;

    });

    it('returns the value found in the path from the root of the tree', function(){

      expect(resolve(tree, 'foo.bar.hello', [{ field: 'foo' }, { field: 'bar' }, { field: 'hello' }])).to.eq('world');

    });

    it('throws a propagated error if an error different from path not found occurs', function(){

      expect(function(){ resolve(tree, 'foo.bar.hello', null); }).to.throw(errors.InvalidPathError);

    });

  });
});
