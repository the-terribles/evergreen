'use strict';

var _ = require('lodash'),
    util = require('util'),
    chai = require('chai'),
    sinon = require('sinon'),
    expect = chai.expect,
    errors = require('../../lib/errors'),
    ContentLoader = require('../../lib/directives/content-loader'),
    DirectiveContext = require('../../lib/directive-context');

describe('Directives', function(){

  describe('ContentLoader', function(){

    var TestContentLoader = function(loadFn){
      ContentLoader.call(this, 'test-content-loader');
      this.load = loadFn || this.load;
    };

    util.inherits(TestContentLoader, ContentLoader);

    it('should pass the expression to the source provider', function(next){

      var context = new DirectiveContext('test-content-loader', './asdf/asdf', []),
         contentLoader = new TestContentLoader(function(expression, callback){
           expect(expression).to.eq('./asdf/asdf');
           callback(null, 'text/plain', 'content from file');
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

    it('should not parse the source content if the content is not a string', function(next){

      var stub = sinon.stub(),
        contentLoader = new TestContentLoader(stub),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, 'application/javascript', { foo: "bar" });

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

      stub.callsArgWith(1, null, 'application/json', '{ "foo": "bar" }');

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.null;
        expect(stub.called).to.be.true;
        expect(returnedContext).to.eq(context);
        expect(returnedContext.value).to.deep.eq({ foo: "bar" });
        next();
      });
    });

    it('should throw an error if the content loader does not implement the load function', function(next){

      var contentLoader = new TestContentLoader(),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.an.instanceOf(errors.NotImplementedError)
        next();
      });
    });

    it('should return throw an error if the content-type is application/json and it is unparsable', function(next){

      var stub = sinon.stub(),
        contentLoader = new TestContentLoader(stub),
        context = new DirectiveContext('test-content-loader', './asdf/asdf', []);

      stub.callsArgWith(1, null, 'application/json', 'this should not be parsable');

      contentLoader.handle(context, {}, {}, function(err, returnedContext){
        expect(err).to.be.an.instanceOf(errors.JSONParseError)
        next();
      });
    });
  });
});
