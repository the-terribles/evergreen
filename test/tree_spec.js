'use strict';

var chai = require('chai'),
    expect = chai.expect,
    tree = require('../lib/tree');

describe('Tree Handler', function(){

  it('processes a deeply nested tree', function(){

    var config = {
      foo: 'bar',
      pool: {
        driver: 'mysql',
        connection: 'mysql://{{host}}:{{port}}',
        instances: 10
      }
    };

    var actual = tree.evaluate(config);

    expect(actual.errors).to.have.lengthOf(0);

    expect(actual.evaluatedTree).to.deep.eq({
      foo: 'bar',
      pool: {
        driver: 'mysql',
        connection: {
          __type__: 'Expression',
          expression: [
            { type: 'content', value: 'mysql://' },
            { type: 'placeholder', value: 'host' },
            { type: 'content', value: ':' },
            { type: 'placeholder', value: 'port' }
          ]
        },
        instances: 10
      }
    });

    expect(actual.pathsToProcess).to.deep.eq([
      {
        local: [ { field: 'pool' }, { field: 'connection' } ],
        global: [ { field: 'pool' }, { field: 'connection' } ]
      }
    ]);

  });

  it('processes arrays as using indexed placeholders', function(){

    var config = {
      foo: 'bar',
      array: [
        'mysql://{{host}}:{{port}}',
        {
          consul: 'http://localhost:8500?token={{consul.token}}'
        }
      ]
    };

    var actual = tree.evaluate(config);

    expect(actual.errors).to.have.lengthOf(0);

    expect(actual.evaluatedTree).to.deep.eq({
      foo: 'bar',
      array: [
        {
          __type__: 'Expression',
          expression: [
            { type: 'content', value: 'mysql://' },
            { type: 'placeholder', value: 'host' },
            { type: 'content', value: ':' },
            { type: 'placeholder', value: 'port' }
          ]
        },
        {
          consul: {
            __type__: 'Expression',
            expression: [
              { type: 'content', value: 'http://localhost:8500?token=' },
              { type: 'placeholder', value: 'consul.token' }
            ]
          }
        }
      ]
    });

    expect(actual.pathsToProcess).to.deep.eq([
      {
        local: [ { field: 'array' }, { index: 0 } ],
        global: [ { field: 'array' }, { index: 0 } ]
      },
      {
        local: [ { field: 'array' }, { index: 1 }, { field: 'consul' } ],
        global: [ { field: 'array' }, { index: 1 }, { field: 'consul' } ]
      }
    ]);

  });

});