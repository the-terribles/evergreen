'use strict';

var _ = require('lodash'),
    chai = require('chai'),
    errors = require('../lib/errors'),
    expect = chai.expect,
    sinon = require('sinon'),
    TestUtils = require('./utils'),
    AssertionError = require('assert').AssertionError,
    Configurator = require('../lib/configurator');

describe('Configurator', function(){

  var identityDirective = {
    strategy: 'i',
    handle: function(context, tree, metadata, callback){
      return callback(null, context.resolve(context.expression));
    }
  };

  var camelCaseDirective = {
    strategy: 'camelcase',
    handle: function(context, tree, metadata, callback){
      return callback(null, context.resolve(_.camelCase(context.expression)));
    }
  };

  var etherResolver = {
    name: 'ether',
    order: 5,
    resolve: function(tree, sympath){ return (sympath.indexOf('ether') === 0)? 'the mists have provided!' : null; }
  };

  var cthulhuResolver = {
    name: 'cthulhu',
    order: 5,
    resolve: function(tree, sympath){ return (sympath.indexOf('cthulhu') === 0)? 'squiggly tentacles!' : null; }
  };

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

  it('should allow the addition of resolvers', function(next){

    var resolver = function(tree, path){
          if (path === 'registry.abc123') return 'bar';
        },
        configurator = new Configurator();

    var tree = {
      foo: '{{registry.abc123}}'
    };

    configurator.addResolver({ name: 'registry', order: 10, resolve: resolver });

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({
        foo: 'bar'
      });

      next();
    });

    configurator.render(tree);
  });

  it('should allow the removal of resolvers', function(next){

    var configurator = new Configurator();

    process.env.HERE_IS_ENV_PROP = 42;

    var tree = {
      blah: '{{env.HERE_IS_ENV_PROP}}',
      env: 'should be picked up by absolute resolver'
    };

    configurator.removeResolver('absolute');

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({
        blah: '42',
        env: 'should be picked up by absolute resolver'
      });

      next();
    });

    configurator.render(tree);
  });

  it('should allow the addition of directives', function(next){

    var configurator = new Configurator();

    var tree = {
      foo: '$hello:richard'
    };

    configurator.addDirective({
      strategy: 'hello',
      handle: function(context, tree, metadata, callback){
        return callback(null, context.resolve('hello ' + context.expression));
      }
    });

    configurator.on('ready', function(config){

      expect(config).to.deep.eq({
        foo: 'hello richard'
      });

      next();
    });

    configurator.render(tree);
  });

  it('should allow the removal of directives', function(next){

    var configurator = new Configurator();

    var tree = {
      foo: '$file:./data/blah'
    };

    configurator.removeDirective('file');

    configurator.on('error', function(err){
      expect(err).to.be.an.instanceOf(errors.DirectiveHandlerNotFoundError);
      next();
    });

    configurator.render(tree);
  });

  it('should allow the addition of modules', function(next){

    var configurator = new Configurator();

    var tree = {
      foo: '$i:richard',
      mysterious: '{{ether}}'
    };

    configurator.addModule({
      resolvers: [ etherResolver ],
      directives: [ identityDirective ]
    });

    configurator.on('ready', TestUtils.wrapAsync(next, function(config){
      expect(config).to.deep.eq({
        foo: 'richard',
        mysterious: 'the mists have provided!'
      });
    }));

    configurator.render(tree);

  });

  it('should allow the addition of multiple modules in one call', function(next){

    var configurator = new Configurator();

    var tree = {
      foo: '$i:richard',
      mysterious: '{{ether}}',
      other: {
        cultist: 'I call you great - {{cthulhu}}',
        camel: '$camelcase:Sprocket fandango bull fighter'
      }
    };

    configurator.addModules([
      {
        resolvers: [ etherResolver ],
        directives: [ identityDirective ]
      },
      {
        resolvers: [ cthulhuResolver ],
        directives: [ camelCaseDirective ]
      }
    ]);

    configurator.on('ready', TestUtils.wrapAsync(next, function(config){
      expect(config).to.deep.eq({
        foo: 'richard',
        mysterious: 'the mists have provided!',
        other: {
          cultist: 'I call you great - squiggly tentacles!',
          camel: 'sprocketFandangoBullFighter'
        }
      });
    }));

    configurator.render(tree);

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


    it('should have a method to test to see if the configuration is ready', function(next){

      var configurator = new Configurator();

      expect(configurator.isReady()).to.be.false;

      configurator.on('ready', TestUtils.wrapAsync(next, function(config){

        expect(configurator.isReady()).to.be.true;
      }));

      configurator.render({ foo: 'bar', hello: '{{foo}}' });
    });


    it('should have a method to retrieve the configuration if it is ready', function(next){

      var configurator = new Configurator();

      configurator.on('ready', TestUtils.wrapAsync(next, function(config){

        expect(configurator.config()).to.deep.eq({
          foo: 'bar',
          hello: 'bar'
        });
      }));

      configurator.render({ foo: 'bar', hello: '{{foo}}' });
    });


    it('should throw an error if an attempt to retrieve configuration is made when it is not ready', function(){

      var configurator = new Configurator();

      expect(function(){ configurator.config(); }).to.throw(AssertionError);
    });


    describe('Require a JavaScript file on Load', function(){


      it('should allow a file to be required when the configuration is ready', function(next){

        var configurator = new Configurator(),
            spy = sinon.spy(),
            file = './server.js';

        configurator.__requireFile = spy;

        configurator
          .render({ foo: 'bar', hello: '{{foo}}' })
          .andRequire(file);

        configurator.on('ready', function(){
          // We're going to wait for all the other Ready handlers to be called (which includes the require file func),
          // before we evaluate whether the spy has executed.
          process.nextTick(TestUtils.wrapAsync(next, function(){
            expect(spy.calledWith(file)).to.be.true;
          }));
        });
      });

      it('should throw an unchecked Error if the configuration is in error and a file has been required', function(next){
        var configurator = new Configurator(),
          spy = sinon.spy(),
          file = './server.js';

        configurator.__exit = spy;

        configurator
          .render({ foo: 'bar', hello: '$notfound:{{foo}}' })
          .andRequire(file);

        configurator.on('error', function(){
          // We're going to wait for all the other Error handlers to be called (which includes the __exit func),
          // before we evaluate whether the spy has executed.
          process.nextTick(TestUtils.wrapAsync(next, function(){
            expect(spy.called).to.be.true;
          }));
        });
      });
    });

    describe('Returning a Promise', function(){

      it('should resolve the promise when the configuration is ready', function(next){

        new Configurator()
          .render({ foo: 'bar', hello: '{{foo}}' })
          .and()
          .then(
            TestUtils.wrapAsync(next, function(config){
              expect(config).to.deep.eq({
                foo: 'bar',
                hello: 'bar'
              });
            }),
            TestUtils.wrapAsync(next, function(err){
              expect.fail();
            }));

      });

      it('should reject the promise if the configuration is in error', function(next){

        new Configurator()
          .render({ foo: '$notfound:bar' })
          .and()
          .then(
            TestUtils.wrapAsync(next, function(config){
              expect.fail();
            }),
            TestUtils.wrapAsync(next, function(err){
              expect(err).to.be.an.instanceOf(errors.DirectiveHandlerNotFoundError);
            }));
      });
    });
  });
});