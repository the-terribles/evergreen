'use strict';

var chai = require('chai'),
    expect = chai.expect,
    sinon = require('sinon'),
    AssertionError = require('assert').AssertionError,
    Configurator = require('../lib/configurator');

describe('Configurator', function(){

  it('should load configuration from an object template', function(next){

    var configurator = new Configurator();

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({ foo: 'bar', hello: 'bar' });

      next();
    });

    configurator.render({ foo: 'bar', hello: '{{foo}}' });

  });

  it('should load configuration from a file', function(next){

    var configurator = new Configurator();

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({ foo: 'bar', hello: 'bar' });

      next();
    });

    configurator.renderFromFile('./test/data/config.json');
  });

  it('should allow the ordering of resolvers by a position property', function(next){

    var b = function(tree, path){
          return (path === 'mysql.host')? 'example.com' : null;
        },
        a = function(tree, path){
          return (path === '__HALLO__')? 42 : null;
        },
        configurator = new Configurator();

    var tree = {
      foo: 'bar',
      hello: '{{foo}}',
      mysql: {
        host: 'localhost',
        port: 3306
      },
      db: 'mysql://{{mysql.host}}:{{mysql.port}}',
      after: '{{__HALLO__}}'
    };

    configurator.addResolver({ name: 'before', order: 0, resolve: b });
    configurator.addResolver({ name: 'after', order: 4, resolve: a });

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({
        foo: 'bar',
        hello: 'bar',
        mysql: {
          host: 'localhost',
          port: 3306
        },
        db: 'mysql://example.com:3306',
        after: '42'
      });

      next();
    });

    configurator.render(tree);
  });

  it.skip('should allow the addition of resolvers', function(next){

  });

  it.skip('should allow the removal of resolvers', function(next){

  });

  it.skip('should allow the addition of directives', function(next){

  });

  it.skip('should allow the removal of directives', function(next){

  });

  it.skip('should allow the addition of modules', function(next){

  });

  it.skip('should allow the addition of multiple modules in one call', function(next){

  });

  describe('Validation', function(){

    it('should throw an error if the configuration template is not an object', function(){

      var configurator = new Configurator();

      expect(function(){ configurator.render([]); }).to.throw(AssertionError);
      expect(function(){ configurator.render('huh'); }).to.throw(AssertionError);
      expect(function(){ configurator.render(42); }).to.throw(AssertionError);
      expect(function(){ configurator.render(true); }).to.throw(AssertionError);
      expect(function(){ configurator.render(); }).to.throw(AssertionError);
    });

    it('should throw an error if a supplied resolver is not valid', function(){

      var configurator = new Configurator();

      // Incomplete params
      expect(function(){ configurator.addResolver('some string'); }).to.throw(AssertionError);
      expect(function(){ configurator.addResolver({}); }).to.throw(AssertionError);
      expect(function(){ configurator.addResolver({ name: 'resolver' }); }).to.throw(AssertionError);
      expect(function(){ configurator.addResolver({ name: 'resolver', order: 1 }); }).to.throw(AssertionError);
      expect(function(){ configurator.addResolver({ name: 'resolver', resolve: function(){} }); }).to.throw(AssertionError);
      expect(function(){ configurator.addResolver({ order: 1 , resolve: function(){} }); }).to.throw(AssertionError);

      // Params Type Tests
      expect(function(){
        configurator.addResolver({ name: 34, order: 'not a number' , resolve: function(){} }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addResolver({ name: 'resolver', order: 'not a number' , resolve: function(){} }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addResolver({ name: 'resolver', order: 'not a number' , resolve: 234 }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addResolver({ name: 'resolver', order: 'not a number' , resolve: 'asdf' }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addResolver({ name: 'resolver', order: 24 , resolve: function(){} }); }
      ).to.not.throw(AssertionError);
    });

    it('should throw an error if a supplied directive is not valid', function(){

      var configurator = new Configurator();

      // Incomplete params
      expect(function(){ configurator.addDirective('some string'); }).to.throw(AssertionError);
      expect(function(){ configurator.addDirective({}); }).to.throw(AssertionError);
      expect(function(){ configurator.addDirective({ strategy: 'ref' }); }).to.throw(AssertionError);
      expect(function(){ configurator.addDirective({ handle: function(){} }); }).to.throw(AssertionError);

      // Params Type Tests
      expect(function(){
        configurator.addDirective({ strategy: 34, handle: function(){} }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addDirective({ strategy: 'ref', handle: 'not a fn' }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addDirective({ strategy: 'ref', handle: function(){} }); }
      ).to.not.throw(AssertionError);

    });

    it('should throw an error if a supplied module is not valid', function(){

      var configurator = new Configurator();

      // Incomplete params
      expect(function(){ configurator.addModule('some string'); }).to.throw(AssertionError);
      expect(function(){ configurator.addModule([]); }).to.throw(AssertionError);

      // Params Type Tests
      expect(function(){
        configurator.addModule({ resolvers: 34 }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addModule({ directives: 42 }); }
      ).to.throw(AssertionError);

      expect(function(){
        configurator.addModule({ resolvers: [], directives: [] }); }
      ).to.not.throw(AssertionError);
    });

    it('should throw an error if an attempt is made to remove a non-existent resolver', function(){

      var configurator = new Configurator();

      expect(function(){ configurator.removeResolver('foobar'); }).to.throw(AssertionError);
    });

    it('should throw an error if an attempt is made to remove a non-existent directive', function(){

      var configurator = new Configurator();

      expect(function(){ configurator.removeDirective('foobar'); }).to.throw(AssertionError);
    });
  });

  describe('Returning the configuration', function(){

    it.skip('should have a method to test to see if the configuration is ready', function(){

    });

    it.skip('should have a method to retrieve the configuration if it is ready', function(){

    });

    it.skip('should throw an error if an attempt to retrieve configuration is made when it is not ready', function(){

    });

    describe('Require a JavaScript file on Load', function(){

      it.skip('should allow a file to be required when the configuration is ready', function(next){

      });

      it.skip('should throw an unchecked Error if the configuration is in error and a file has been required')

    });

    describe('Returning a Promise', function(){

      it.skip('should resolve the promise when the configuration is ready', function(next){

      });

      it.skip('should reject the promise if the configuration is in error', function(next){

      });
    });
  });
});