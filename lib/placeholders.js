'use strict';

var nextPlaceholder;

module.exports.nextPlaceholder = nextPlaceholder = function(accumlator, string){

  accumlator = accumlator || [];

  var nextPlaceholderStart = string.indexOf('{{');

  if (nextPlaceholderStart >= 0){

    // Check to see if the placeholder is escaped (e.g. a "\" in front of it)
    if (nextPlaceholderStart > 0){


    }
  }
  return accumlator;
};

module.exports.parse = function(string){




};

