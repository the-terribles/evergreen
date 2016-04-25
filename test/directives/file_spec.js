'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    sinon = require('sinon'),
    Path = require('path'),
    errors = require('../../lib/errors'),
    expect = chai.expect,
    FileContentLoader = require('../../lib/directives/file'),
    DirectiveContext = require('../../lib/directive-context');

describe('Directives', function() {

  describe('FileContentLoaded', function () {

    it('should return an error if the file is not found', function(next){

      var fileLoader = new FileContentLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.notfound'), []);

      fileLoader.handle(context, {}, {}, function(err){
        expect(err).to.be.an.instanceOf(errors.FileNotFoundError);
        next();
      });
    });

    it('should return the contents of the file', function(next){

      var fileLoader = new FileContentLoader(),
          context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.txt'), []);

      fileLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.eq('This is some text.');
        next();
      });
    });

    it('should return parsed contents of the file if JSON', function(next){

      var fileLoader = new FileContentLoader(),
        context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.json'), []);

      fileLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.deep.eq({ foo: 'bar' });
        next();
      });
    });

    // it('should return an executed JavaScript file', function(next){
    //
    //   var fileLoader = new FileLoader(),
    //     context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.js'), []);
    //
    //   fileLoader.handle(context, {}, {}, function(err, _context){
    //     expect(err).to.be.null;
    //     expect(_context.value).to.deep.eq({ foo: 6 });
    //     next();
    //   });
    // });

    it('should not cause an error if the file is not text-based', function(next){

      var fileLoader = new FileContentLoader(),
        context = new DirectiveContext('file', Path.join(__dirname, './data/file-test.png'), []);

      fileLoader.handle(context, {}, {}, function(err, _context){
        expect(err).to.be.null;
        expect(_context.value).to.not.be.null;
        expect(_context.value).to.be.an.instanceOf(Buffer);
        next();
      });
    });
  });
});