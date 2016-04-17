'use strict';

var _ = require('lodash');

var TEST_TREE = {
  foo: 'bar',
  host: 'localhost',
  mysql: {
    port: 3306
  },
  pool: {
    driver: 'mysql',
    connection: 'mysql://{{host}}:{{mysql.port}}',
    instances: 10
  }
};

var TEST_LEAF_METADATA = {
  type: 'expression',
  dependencies: {
    'host': [ { field: 'host' }],
    'mysql.port': [ { field: 'mysql' }, { field: 'port' } ]
  },
  path: [ { field: 'pool' }, { field: 'connection' } ],
  expression: [
    { type: 'content', value: 'mysql://' },
    { type: 'placeholder', value: 'host' },
    { type: 'content', value: ':' },
    { type: 'placeholder', value: 'mysql.port' }
  ]
};

var TEST_METADATA = {
  errors: [],
  paths: {
    'foo':          { type: 'constant', path: [ { field: 'foo' } ] },
    'host':         { type: 'constant', path: [ { field: 'host' } ]  },
    'mysql':        { type: 'branch', path: [ { field: 'mysql' } ]  },
    'mysql.port':   { type: 'constant', path: [ { field: 'mysql' }, { field: 'port' } ]  },
    'pool':    { type: 'branch', path: [ { field: 'pool' } ]  },
    'pool.driver':  { type: 'constant', path: [ { field: 'pool' }, { field: 'driver' } ]  },
    'pool.connection': _.cloneDeep(TEST_LEAF_METADATA),
    'pool.instances': { type: 'constant', path: [ { field: 'pool' }, { field: 'instances' } ] }
  }
};

module.exports = {
  tree: TEST_TREE,
  leaf: TEST_LEAF_METADATA,
  metadata: TEST_METADATA
};