'use strict';

var chai = require('chai'),
    expect = chai.expect,
    Configurator = require('../lib/configurator');

describe('Configurator', function(){

  it('loads configuration tree from an object', function(next){

    var configurator = new Configurator();

    configurator.loadRoot({ foo: 'bar' }, function(config){

      next();
    });

  });

});