'use strict';

module.exports.wrapAsync = function(next, evaluatee){
  return function(){
    try {
      evaluatee.apply(null, arguments);
      next();
    }
    catch (e){
      next(e);
    }
  };
};