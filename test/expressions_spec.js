'use strict';

var chai = require('chai'),
    expect = chai.expect,
    expressions = require('../lib/expressions'),
    parse = expressions.parse;

var expectExpression = function(pieces){
  return new ExpressionExpect(pieces);
};

var ExpressionExpect = function(pieces){
  this.pieces = pieces;
};

ExpressionExpect.prototype.at = function(index){
  this.index = index;
  return this;
};

ExpressionExpect.prototype.evaluate = function(type, value) {
  expect(this.pieces[this.index].type).to.eq(type);
  expect(this.pieces[this.index].value).to.eq(value);
};

ExpressionExpect.prototype.toBeDirective = function(value) { this.evaluate('directive', value) };
ExpressionExpect.prototype.toBePlaceholder = function(value) { this.evaluate('placeholder', value) };
ExpressionExpect.prototype.toBeContent = function(value) { this.evaluate('content', value) };

describe('Expressions Handler', function(){

  describe('When Parsing', function(){

    it('should parse directives if they are at the beginning of the expression', function(){

      var pieces = parse('$ref::root.branch.leaf');

      expect(pieces.length).to.eq(2);

      expectExpression(pieces).at(0).toBeDirective('ref');
      expectExpression(pieces).at(1).toBeContent('root.branch.leaf');

      pieces = parse('$ref::root.{{env.NODE_ENV}}.leaf');

      expect(pieces.length).to.eq(4);

      expectExpression(pieces).at(0).toBeDirective('ref');
      expectExpression(pieces).at(1).toBeContent('root.');
      expectExpression(pieces).at(2).toBePlaceholder('env.NODE_ENV');
      expectExpression(pieces).at(3).toBeContent('.leaf');

    });

    it('should parse placeholders anywhere they occur in the expression', function(){

      var pieces = parse('{{protocol}}://{{host}}:{{port}}/api/v2/resource{{theend}}');

      expect(pieces.length).to.eq(7);

      expectExpression(pieces).at(0).toBePlaceholder('protocol');
      expectExpression(pieces).at(1).toBeContent('://');
      expectExpression(pieces).at(2).toBePlaceholder('host');
      expectExpression(pieces).at(3).toBeContent(':');
      expectExpression(pieces).at(4).toBePlaceholder('port');
      expectExpression(pieces).at(5).toBeContent('/api/v2/resource');
      expectExpression(pieces).at(6).toBePlaceholder('theend');
    });

    it('should allow placeholders to have whitespace between brackets and variable', function(){

      var pieces = parse('http://{{  wow.give.me.space   }}');

      expect(pieces.length).to.eq(2);

      expectExpression(pieces).at(0).toBeContent('http://');
      expectExpression(pieces).at(1).toBePlaceholder('wow.give.me.space');
    });

    it('should return a single content element if there are no placeholders or directives', function(){

      var expression = 'http://evergreen.the-terribles.com',
        pieces = parse(expression);

      expect(pieces.length).to.eq(1);

      expectExpression(pieces).at(0).toBeContent(expression);
    });

    it('should allow placeholders to be escaped', function(){

      var expression = 'http://evergreen.the-terribles.com/users/\\{{userId}}',
          pieces = parse(expression);

      expect(pieces.length).to.eq(1);

      expectExpression(pieces).at(0).toBeContent(expression);

      pieces = parse('http://\\{{subdomain}}.the-terribles.com:{{port}}/users/\\{{userId}}');

      expect(pieces.length).to.eq(3);

      expectExpression(pieces).at(0).toBeContent('http://\\{{subdomain}}.the-terribles.com:');
      expectExpression(pieces).at(1).toBePlaceholder('port');
      expectExpression(pieces).at(2).toBeContent('/users/\\{{userId}}');
    });


  });

  it('should detect escaped placeholders', function(){

    var shouldNotHave = expressions.hasEscapedPlaceholder('http://{{subdomain}}.the-terribles.com/users/{{userId}}');

    expect(shouldNotHave).to.be.false;

    var shouldHave = expressions.hasEscapedPlaceholder('http://{{subdomain}}.the-terribles.com/users/\\{{userId}}');

    expect(shouldHave).to.be.true;
  });

  it('should unescape escaped placeholders', function(){

    var unescaped = expressions.unhandleEscapedPlaceholders('http://{{subdomain}}.the-terribles.com/users/<|||userId|||>');

    expect(unescaped).to.eq('http://{{subdomain}}.the-terribles.com/users/\\{{userId}}')
  });

  it('should escape escaped placeholders to prevent them from being processed', function(){

    var escaped = expressions.handleEscapedPlaceholders('http://\\{{subdomain}}.the-terribles.com/users/\\{{userId}}');

    expect(escaped).to.eq('http://<|||subdomain|||>.the-terribles.com/users/<|||userId|||>');
  });

  it('should throw an exception if it cannot parse an expression', function(){

    expect(function(){ parse('http://{{host:port'); }).to.throw(Error);
  });
});

