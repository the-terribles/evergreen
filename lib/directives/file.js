'use strict';

var fs = require('fs'),
    path = require('path');

/**
 * Directive handler 'fs'.
 *
 *
 */
module.exports = {
  strategy: 'fs',
  handle: function(context, tree, metadata, callback){

    var filePath = path.resolve(process.cwd(), context.expression);

    fs.stat(filePath, function(err, stats){
      if (err) return callback(err, context);
      if (!stats.isFile()){
        return callback();
      }
    });

  }
};