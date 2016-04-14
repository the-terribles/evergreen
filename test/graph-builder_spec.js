'use strict';

var chai = require('chai'),
    expect = chai.expect,
    GraphBuilder = require('../lib/graph-builder');

describe('Graph Builder', function(){

  it('joins expression content', function(){

    var expression = [
      { type: 'directive', value: '$ref' },
      { type: 'content', value: 'mysql://' },
      { type: 'content', value: 'localhost' },
      { type: 'content', value: ':' },
      { type: 'content', value: '3306' }
    ];

    expect(GraphBuilder.joinExpressionContent(expression)).to.eq('mysql://localhost:3306');

  });

  describe('Dependency Resolution', function(){

    it('can determine if dependencies have been resolved for a leaf', function(){

      

    });

  });

});