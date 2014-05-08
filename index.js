'use strict';

var slice = Array.prototype.slice;
var pow = Math.pow;
// event mods
var BEFORE = 1;
var AFTER = 2;
var AROUND = 4;
var EMS = 'before after around'.split(' ');

function adviceMods(m) {
  var a = [], k = 0;
  while (EMS[k]) {
    if (m & pow(2, k)) a.push(EMS[k]);
    k++;
  }
  return a;
}

/**
 *  Expose `Aspects`.
 */

var Aspects = module.exports;

Aspects.Method = Method;
Aspects.Halt = Halt;
Aspects.Prevent = Prevent;
Aspects.AlterArgs = AlterArgs;
Aspects.AlterReturn = AlterReturn;
Aspects.Advice = Advice;
Aspects.Executor = Executor;
Aspects.Handler = Handler;

/**
 *  Initialize a Method.
 *
 *  @param {Object} obj
 *  @param {String} fn
 *  @api public
 */

function Method(obj, fn) {
  this.obj = obj;
  this.methodName = fn;
  this.method = obj[fn];
}

/**
 *  Execute the method
 *
 *  @param {Mixed}
 *  @return {Mixed}
 *  @api public
 */

Method.prototype.exec = function () {
  return this.method.apply(this.obj, arguments);
};

/**
 *  Alter arguments when before.
 *
 *  @param {String} msg
 *  @param {Array} newArgs
 */

function AlterArgs(msg, newArgs) {
  this.msg = msg;
  this.newArgs = newArgs;
}

/**
 *  Alter results when after.
 *
 *  @param {String} msg
 *  @param {any} newRetVal
 */

function AlterReturn(msg, newRetVal) {
  this.msg = msg;
  this.newRetVal = newRetVal;
}

/**
 *  Stop the main function when before/after.
 *
 *  @param {String} msg
 *  @param {any} retVal
 */

function Halt(msg, retVal) {
  this.msg = msg;
  this.retVal = retVal;
}

/**
 *  Alter prevented status and jump the main function when before.
 *
 *  @param {String} msg
 */

function Prevent(msg) {
  this.msg = msg;
}

/**
 *  Initialize a Advice.
 *
 *  @param {Object} obj
 *  @param {Function} fn
 *  @param {Number} e eventcode = {before: 1, after: 2, around: 4}
 */

function Advice(obj, fn, e) {
  // default before event
  var ms = adviceMods(e);
  if (!ms.length) return false;

  this.target = obj;
  this.fn = fn;
  this.mode = e;
  this.type = ms.join(' ');
  while ((e = ms.pop())) {
    this['__' + e] = 1;
  }
}

Advice.prototype = {

  /**
   *  Execute the function.
   *
   *  @param {Number} e
   *  @param {Mixed}
   *  @param {Mixed}
   *  @return {Mixed}
   *  @api private
   */

  _exec: function (e) {
    if (this['__' + EMS[e >> 1]]) {
      return this.fn.call(this.target, arguments[1], arguments[2]);
    }
  },

  /**
   *  Add a before function.
   *
   *  @param {Mixed} args
   *  @return {Mixed}
   */

  before: function () {
    return this._exec(BEFORE, arguments[0], arguments[1]);
  },

  /**
   *  Add a after function.
   *
   *  @param {Mixed} args
   *  @return {Mixed}
   */

  after: function () {
    return this._exec(AFTER, arguments[0], arguments[1]);
  },

  /**
   *  Add a around function.
   *  @param {Mixed} args
   *  @return {Mixed}
   */

  around: function () {
    return this._exec(AROUND, arguments[0], arguments[1]);
  }
};

/**
 *  @param {Object} target
 *  @param {Object} advice
 */

function Executor(target, advice) {
  this.target = target || null;
  this.advice = advice || null;
}

Executor.prototype = {

 /**
  * Execute the handle.
  *
  *  @param {any} arg*
  *  @return {any} ret
  */

  exec: function () {
    var args = slice.call(arguments, 0),
        prevented = false,
        target = this.target,
        advice = this.advice,
        ret, newRet;

    if (advice) {

      if (advice.e === AROUND) {
        ret = advice.around(target, args);
      } else {

        // execute before method
        ret = advice.before(target, args);
        if (ret) {
          switch (ret.constructor) {
            case Halt:
              return ret.retVal;
            case AlterArgs:
              args = ret.newArgs;
              break;
            case Prevent:
              prevented = true;
              break;
            default:
          }
        }

        // execute method
        if (!prevented) {
          ret = target.exec.apply(target, args);
        }

        this.originalRetVal = target.currentRetVal;
        this.currentRetVal = ret;

        // execute after method
        newRet = advice.after(target, args);
        if (newRet) {
          switch (newRet.constructor) {
            case Halt:
              return newRet.retVal;
            case AlterReturn:
              ret = newRet.newRetVal;
              this.currentRetVal = ret;
          }
        }
      }

    } else {
      ret = target.exec.apply(target, args);
    }

    return ret;
  }
};

/**
 *  @param {Object} executor
 */

function Handler(executor) {
  this.executor = executor;
}

/**
 *  Create a handler instance
 */

Handler.getInstance = function (obj, fn) {
  return new Handler(new Method(obj, fn));
};

Handler.prototype = {

  /**
   *  Add a advice to this handler
   *
   *  @param {Advice} advice
   *  @return {Executor} executor
   */

  add: function (advice) {
    this.executor = new Executor(this.executor, advice);
    return this.executor;
  },

  /**
   *  Remove a advice
   *
   *  @param {Advice} advice
   *  @return {Executor} executor
   */

  remove: function (advice) {
    var er = this.executor;
    if (er.advice) {
      if (er.advice === advice) {
        er = er.target;
      } else {
        er.target = this.remove(advice);
      }
    }
    //this.executor = er;
    return er;
  },

  /**
   *  Execute method
   *
   *  @return {Mixed} executor.exec
   *
   *  @see executor.exec
   */

  exec: function () {
    return this.executor.exec.apply(this.executor, arguments);
  },

  inject: function (when, fn, obj) {
    var advice = new Advice(obj || {}, fn, when);
    return this.add(advice);
  },

  before: function (fn, obj) {
    return this.inject(BEFORE, fn, obj);
  },

  after: function (fn, obj) {
    return this.inject(AFTER, fn, obj);
  },

  around: function (fn, obj) {
    return this.inject(AROUND, fn, obj);
  }
};
