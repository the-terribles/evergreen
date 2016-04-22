'use strict';

var _ = require('lodash'),
  chai = require('chai'),
  expect = chai.expect,
  resolve = require('../../lib/resolvers/environment');

describe('Resolvers', function(){

  describe('Environment', function(){

    var env = {
      SERVICE: 'www',
      NODE_ENV: 'production',
      AWS_ACCESS_KEY: 'abc123',
      AWS_SECRET_KEY: 'aakhcakshakshdfkajshfkjahsdkjahsfkhj',
      PORT: '1234',
      SHOULD_LOG: 'true'
    };

    var tree = {
      foo: {
        bar: 123
      }
    };

    it('should return null if the path does not start in the "env" branch', function(){

      expect(resolve(tree, 'foo.bar', [{field:'foo'}, {field:'bar'}], null, null, env)).to.be.null;

    });
    
    it('should return null if no environment property with the specified name is found', function(){

      expect(resolve(tree, 'env.LOG_LEVEL', [{field:'env'}, {field:'LOG_LEVEL'}], null, null, env)).to.be.null;
    });

    it('should return a value if the path is in the "env" branch', function(){

      expect(resolve(tree, 'env.NODE_ENV', [{field:'env'}, {field:'NODE_ENV'}], null, null, env)).to.eq('production');
    });

    it('should try to parse the environment variable, returning a valid JavaScript type if successful', function(){

      expect(resolve(tree, 'env.PORT', [{field:'env'}, {field:'PORT'}], null, null, env)).to.eq(1234);
      expect(resolve(tree, 'env.SHOULD_LOG', [{field:'env'}, {field:'SHOULD_LOG'}], null, null, env)).to.eq(true);
    });
  });
});