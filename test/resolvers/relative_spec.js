'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  expect = chai.expect,
  errors = require('../../lib/errors'),
  resolve = require('../../lib/resolvers/relative');

describe('Resolvers', function(){

  describe('Relative', function(){

    var tree = {
      foo: {
        bar: {
          hello: {
            world: 'goodbye'
          }
        }
      },
      meaning: {
        of: {
          life: [42]
        },
        coffee: [
          {
            yum: 'yes'
          },
          {
            awake: true
          }
        ]
      }
    };

    it('returns null if the path does not exist relative to the current branch', function(){

      expect(
        resolve(
          tree,
          'hello.mars',
          [{ field: 'hello' }, { field: 'mars' }],
          'foo.bar',
          [{ field: 'foo' }, { field: 'bar' }]
        )
      ).to.be.null;

      expect(
        resolve(
          tree,
          'espresso',
          [{ field: 'espresso' }],
          'meaning.coffee[1]',
          [{ field: 'meaning' }, { field: 'coffee' }, { index: 1 }]
        )
      ).to.be.null;

    });

    it('returns the value found in the path relative to the current branch', function(){

      expect(
        resolve(
          tree,
          'hello.world',
          [{ field: 'hello' }, { field: 'world' }],
          'foo.bar',
          [{ field: 'foo' }, { field: 'bar' }]
        )
      ).to.eq('goodbye');

      expect(
        resolve(
          tree,
          'yum',
          [{ field: 'yum' }],
          'meaning.coffee[0]',
          [{ field: 'meaning' }, { field: 'coffee' }, { index: 0 }]
        )
      ).to.eq('yes');
    });

    it('throws a propagated error if an error different from path not found occurs', function(){

      expect(function(){
        resolve(
          tree,
          'hello.world',
          null,
          'foo.bar',
          [{ field: 'foo' }, { field: 'bar' }]
        );
      }).to.throw(errors.InvalidPathError);

    });
  });
});
