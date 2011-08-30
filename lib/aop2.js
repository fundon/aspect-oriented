var ASLICE = Array.prototype.slice,
    BEFORE = 1,
    AFTER = 2,
    AROUND = 4;

/**
 * 包装对象-方法
 * @class Method
 * @constructor
 * @param {Object} obj 要操作的对象
 * @param {String} sFn 要执行的方法名
 */
function Method(obj, sFn) {
    this.obj = obj;
    this.methodName = sFn;
    this.method = obj[sFn];
};

/**
 * 执行包装的方法
 * @method exec
 * @param {any} arg*
 * @return {any}
  */
Method.prototype.exec = function () {
    return this.method.apply(this.obj, arguments);
};

/**
 * 可以在执行 before 函数时修改参数
 * @class AlterArgs
 * @constructor
 * @param {String} msg
 * @param {Array} newArgs
 */
function AlterArgs(msg, newArgs) {
    this.msg = msg;
    this.newArgs = newArgs;
};

/**
 * 可以在执行 after 函数时修改返回值
 * @class AlterReturn
 * @constructor
 * @param {String} msg
 * @param {any} newRetVal
 */
function AlterReturn(msg, newRetVal) {
    this.msg = msg;
    this.newRetVal = newRetVal;
};

/**
 * 可以在执行 before/after 时终止主体函数
 * @class Halt
 * @constructor
 * @param {String} msg
 * @param {any} retVal
 */
function Halt(msg, retVal) {
    this.msg = msg;
    this.retVal = retVal;
};

/** 
 * 可以在执行 before 时，修改 prevented = true 状态， 跳过主体函数
 * @class Prevent
 * @constructor
 * @param {String} msg
 */
function Prevent(msg) {
    this.msg = msg;
};

/**
 * Advice 代理类
 * @class Advice
 * @constructor
 * @param {Object} obj
 * @param {Function} fn
 * @param {Number} e eventcode = {before: 1, after: 2, around: 4}
 */
function Advice(obj, fn, e) {
    // default before event
    var et = Advice.eventTypes[e >> 1];
    if (!et) {
        return false; 
    }
    this.target = obj;
    this.fn = fn;
    this.e = e;
    this.type = et;
    this['_' + et + '_'] = 1;
};

/** 
 * 支持的事件类型  befre: 1, after: 2, around: 4
 * @property
 * @static
 */
Advice.eventTypes = ['before', 'after', 'around'];

Advice.prototype = {

    /**
     * @private
     * @method _exec
     * @param {Number} e
     * @param {any}
     * @return {any}
     */
    _exec: function (e) {
        var et = Advice.eventTypes[e >> 1];
        if (this['_' + et + '_']) {
            return this.fn.call(this.target, arguments[1], arguments[2]);
        }
        //throw new Error('No has ' + et + ' event.');
        //console.log('No has ' + et + ' event.');
    },

    /**
     * 给主体函数添加 before 事件
     * @method before
     * @param {any} args
     * @return {any}
     */
    before: function () {
        return this._exec(BEFORE, arguments[0], arguments[1]);
    },

    /**
     * 给主体函数添加 after 事件
     * @method after
     * @param {any} args
     * @return {any}
     */
    after: function () {
        return this._exec(AFTER, arguments[0], arguments[1]);
    },

    /**
     * 给主体函数添加 around 事件
     * @method around
     * @param {any} args
     * @return {any}
     */
    around: function () {
        return this._exec(AROUND, arguments[0], arguments[1]);
    }
};

/**
 * 请求处理类
 * @class Handler
 * @constructor
 * @param {Object} target
 * @param {Object} advice
 */
function Executor(target ,advice) {
    this.target = target || null;
    this.advice = advice || null;
};

Executor.prototype = {

    /**
     * 执行函数
     * @method handle
     * @param {any} arg*
     * @return {any} ret
     */
    exec: function () {
        var args = ASLICE.call(arguments, 0),
            ret, newRet,
            prevented = false,
            target = this.target,
            advice = this.advice;

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

function Handler(executor) {
    this.executor = executor;
};

Handler.prototype = {
    add: function (advice) {
        return this.executor = new Executor(this.executor, advice);
    },
    remove: function (advice) {
        var exe = this.executor;
        if (exe.advice) {
            if (exe.advice === advice) {
                exe = exe.target;
            } else {
                exe.target = this.remove(advice);
            }
        }
        return this.executor = exe;
    },
    exec: function () {
        return this.executor.exec.apply(this.executor, arguments);
    },
    _inject: function (when, fn, obj) {
        var advice = new Advice(obj, fn, when);
        return this.executor = new Executor(this.executor, advice);
    },
    before: function (fn, obj) {
        return this._inject(1, fn, obj);
    },
    after: function (fn, obj) {
        return this._inject(2, fn, obj);
    },
    around: function (fn, obj) {
        return this._inject(4, fn, obj);
    }
};

function EventTarget() {
    this.events = {};
};

EventTarget.prototype = {
    on: function (type, fn) {
    },
    fire: function (type, callback) {
    },
    detach: function (type, callback) {
    }
};

var Aop = {};

Aop.Method = Method;
Aop.Halt = Halt;
Aop.Prevent = Prevent;
Aop.AlterArgs = AlterArgs;
Aop.AlterReturn = AlterReturn;
Aop.Advice = Advice;
Aop.Executor = Executor;
Aop.Handler = Handler;

if (typeof exports === 'object') {
    exports.Aop = Aop;
}
