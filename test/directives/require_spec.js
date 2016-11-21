'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  sinon = require('sinon'),
  Path = require('path'),
  errors = require('../../lib/errors'),
  expect = chai.expect,
  RequireLoader = require('../../lib/directives/require'),
  DirectiveContext = require('../../lib/directive-context'),
  errors = require('../../lib/errors'),
  FileNotFoundError =  errors.FileNotFoundError,
  NotAFileError =  errors.NotAFileError,
  JavaScriptFileLoadError =  errors.JavaScriptFileLoadError,
  NotAJavaScriptFileError = errors.NotAJavaScriptFileError;

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

    it('should throw an error if the file does not exist', function(next){

      var requireLoader = new RequireLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data/unexisting-file-test.js'), []);

      requireLoader.handle(context, {}, {}, function(err, _context){
        expect(err).not.to.be.null;
        expect(err).to.be.an.instanceof(FileNotFoundError);
        next();
      });

    });

    it('should throw an error if the file is not a javascript file', function(next){

      var requireLoader = new RequireLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.txt'), []);

      requireLoader.handle(context, {}, {}, function(err, _context){
        expect(err).not.to.be.null;
        expect(err).to.be.an.instanceof(NotAJavaScriptFileError);
        next();
      });

    });

    it('should throw an error if the file is not a file', function(next){

      var requireLoader = new RequireLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data'), []);

      requireLoader.handle(context, {}, {}, function(err, _context){
        expect(err).not.to.be.null;
        expect(err).to.be.an.instanceof(NotAFileError);
        next();
      });

    });

    it('should throw an error if the file is not a file', function(next){

      var requireLoader = new RequireLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data/buggy-file-test.js'), []);

      requireLoader.handle(context, {}, {}, function(err, _context){
        expect(err).not.to.be.null;
        expect(err).to.be.an.instanceof(JavaScriptFileLoadError);
        next();
      });

    });

  });
});
