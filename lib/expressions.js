'use strict';

var _ = require('lodash'),
    grammar = require('./generated/grammar.js'),
    ESCAPED_PLACEHOLDER_START = '<|||',
    ESCAPED_PLACEHOLDER_END = '|||>';

/**
 * Transforms the escaped placeholders into some that won't get
 * parsed by the grammar.
 * @param string {String} the expression that has escaped placeholders to handle.
 * @param _accum {String} used for storing the string between recursions (don't provide).
 * @returns {String} expression with the escaped placeholders handled.
 */
var handleEscapedPlaceholders = function(string, _accum){
  _accum = _accum || '';
  var next = string.indexOf('\\{{');
  if (next >= 0){
    _accum += string.slice(0, next);
    _accum += ESCAPED_PLACEHOLDER_START;
    string = string.slice(next + 3);
    var end = string.indexOf('}}');
    _accum += string.slice(0, end);
    _accum += ESCAPED_PLACEHOLDER_END;
    return handleEscapedPlaceholders(string.slice(end + 2), _accum);
  }
  return _accum;
};

/**
 * Returns the escaped placeholders back to the original escaped format.
 * @param string {String} string to unescape escaped placeholders.
 * @returns {String} string transformed back into the original format.
 */
var unhandleEscapedPlaceholders = function(string){
  return string
           .replace(ESCAPED_PLACEHOLDER_START, '\\{{')
           .replace(ESCAPED_PLACEHOLDER_END, '}}');
};

/**
 * Does the string have an escaped placeholder?
 * @param string {String} expression to check.
 * @returns {Boolean} TRUE if it does, FALSE if it does not.
 */
var hasEscapedPlaceholder = function(string){
  var start = string.indexOf('\\{{');

  if (start < 0) return false;

  var end = string.substring(start).indexOf('}}');

  return start >= 0 && end >= 0;
};

/**
 * Parse the configuration string returning directive, placeholder, and content information.
 * @param string {String} configuration expression.
 * @returns {Array} in order array of expression pieces, where each piece is an object with
 *                  the following schema:
 *                  {
 *                    type: "directive|content|placeholder",
 *                    value: "parsed value"
 *                  }
 */
var parse = function(string){

  var needToHandleEscapedPlaceholders = hasEscapedPlaceholder(string);

  if (needToHandleEscapedPlaceholders) string = handleEscapedPlaceholders(string);

  var pieces = _.flattenDeep(parseExpression(string));

  // Filter the pieces.
  // The grammar will include a "null" if a directive is not found
  // and will provide emtpy strings for content if it is missing.
  // We want to ensure this pieces are not returned to callers.
  var validPieces = _.filter(pieces, function(piece){
    return !(piece === null || _.isEmpty(piece.value));
  });

  return (!needToHandleEscapedPlaceholders)? validPieces : _.map(validPieces, function(piece){
    return {
      type: piece.type,
      value: unhandleEscapedPlaceholders(piece.value)
    };
  });
};

/**
 * Stop gap measure using regular expressions instead of a Peg Grammar.
 * @param expression {String}
 * @returns {Array} Expression syntax
 */
var parseExpression = function(expression){
  var parts = [];

  var directiveAndRest = _.without(expression.split(/^([$][a-zA-Z_-]+:)/), '');

  if (directiveAndRest.length === 2){
    var directive = directiveAndRest[0];
    parts.push({ type: 'directive', value: directive.slice(1, directive.length - 1) });
    expression = directiveAndRest[1];
  }

  var expressionPieces = expression.split(/([{]{2}\s*[a-zA-Z0-9_$.\[\]]*\s*[}]{2})/gm);

  expressionPieces.forEach(function(piece){
    if (piece.indexOf('{{') === 0 && piece.indexOf('}}') > 0){
      var value = piece.slice(2, piece.length - 2).trim();
      parts.push({ type: 'placeholder', value: value });
    }
    else {
      parts.push({ type: 'content', value: piece});
    }
  });
  return parts;
};

module.exports.parse = parse;
module.exports.hasEscapedPlaceholder = hasEscapedPlaceholder;
module.exports.handleEscapedPlaceholders = handleEscapedPlaceholders;
module.exports.unhandleEscapedPlaceholders = unhandleEscapedPlaceholders;