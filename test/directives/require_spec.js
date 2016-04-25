'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  sinon = require('sinon'),
  Path = require('path'),
  errors = require('../../lib/errors'),
  expect = chai.expect,
  RequireLoader = require('../../lib/directives/require'),
  DirectiveContext = require('../../lib/directive-context');

describe('Directives', function() {

  describe('RequireContentLoader', function () {

    it('should return an executed JavaScript file', function(next){

      var requireLoader = new RequireLoader(),
        context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.js'), []);

      requireLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.deep.eq({ foo: 6 });
        next();
      });
    });

  });
});