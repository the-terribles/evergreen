'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  sinon = require('sinon'),
  expect = chai.expect,
  ContentLoader = require('../../lib/directives/content-loader'),
  DirectiveContext = require('../../lib/directive-context');

describe('Directives', function(){

  describe('ContentLoader', function(){

    var TestContentLoader = function(loadFn){
      ContentLoader.call(this, 'test-content-loader');
      this.load = loadFn;
    };

    TestContentLoader.prototype = Object.create(ContentLoader.prototype);
    TestContentLoader.prototype.constructor = TestContentLoader;

    it('should pass the expression to the source provider', function(next){

      var context = new DirectiveContext('test-content-loader', './asdf/asdf', []),
         contentLoader = new TestContentLoader(function(expression, callback){
           expect(expression).to.eq('./asdf/asdf');
           callback(null, 'content from file');
         });

      contentLoader.handle(context, {}, {}, next);
    });

    it('should return an error if the source returns an error', function(next){

      var stub = sinon.stub(),
          contentLoader = new TestContentLoader(stub),
          context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, new Error('failed to retrieve source content'));

      contentLoader.handle(context, {}, {}, function(err){
        expect(err).to.be.an('error');
        expect(stub.called).to.be.true;
        next();
      });
    });

    it('should not parse the source content if the noParse flag is set', function(next){

      var stub = sinon.stub(),
          contentLoader = new TestContentLoader(stub),
          context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, '{ "foo": "bar" }', true);

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.null;
        expect(stub.called).to.be.true;
        expect(returnedContext).to.eq(context);
        expect(returnedContext.value).to.eq('{ "foo": "bar" }');
        next();
      });
    });

    it('should not parse the source content if the content is not a string', function(next){

      var stub = sinon.stub(),
        contentLoader = new TestContentLoader(stub),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, { foo: "bar" });

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.null;
        expect(stub.called).to.be.true;
        expect(returnedContext).to.eq(context);
        expect(returnedContext.value).to.deep.eq({ foo: "bar" });
        next();
      });
    });

    it('should return parsed content if it\'s a valid JSON string', function(next){

      var stub = sinon.stub(),
        contentLoader = new TestContentLoader(stub),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, '{ "foo": "bar" }');

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.null;
        expect(stub.called).to.be.true;
        expect(returnedContext).to.eq(context);
        expect(returnedContext.value).to.deep.eq({ foo: "bar" });
        next();
      });
    });

    it('should return the original content if it\'s not a valid JSON string', function(next){

      var stub = sinon.stub(),
        contentLoader = new TestContentLoader(stub),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, 'this should not be parsable');

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.null;
        expect(stub.called).to.be.true;
        expect(returnedContext).to.eq(context);
        expect(returnedContext.value).to.eq('this should not be parsable');
        next();
      });
    });
  });
});
