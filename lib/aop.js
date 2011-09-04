/**
 * aop file
 * 使用 AOP 处理函数调用
 * 一些方法参考 yui3/event-do.js
 */
(function (Host) {
    var ASLICE = Array.prototype.slice,
        BEFORE = 1,
        AFTER = 2,
        AROUND = 4,
        eventModes = {
            1: 'before',
            2: 'after',
            4: 'around'
        },
        adviceModes = function (m) {
            var a = [], i = m & 1, j = m & 2, k = m & 4;
            i && a.push(eventModes[i]);
            j && a.push(eventModes[j]);
            k && a.push(eventModes[k]);
            return a;
        };

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
    }

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
    }

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
    }

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
    }

    /** 
     * 可以在执行 before 时，修改 prevented = true 状态， 跳过主体函数
     * @class Prevent
     * @constructor
     * @param {String} msg
     */
    function Prevent(msg) {
        this.msg = msg;
    }

    /**
     * Advice Class
     * @class Advice
     * @constructor
     * @param {Object} obj
     * @param {Function} fn
     * @param {Number} e eventcode = {before: 1, after: 2, around: 4}
     */
    function Advice(obj, fn, e) {
        // default before event
        var ms = adviceModes(e);
        if (!ms.length) {
            return false; 
        }
        this.target = obj;
        this.fn = fn;
        this.mode = e;
        this.type = ms.join(' ');
        while (e = ms.pop()) {
            this['_' + e + '_'] = 1;
        }
    }

    Advice.prototype = {

        /**
         * @private
         * @method _exec
         * @param {Number} e
         * @param {any}
         * @return {any}
         */
        _exec: function (e) {
            var et = eventModes[e];
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
     * @class Executor
     * @constructor
     * @param {Object} target
     * @param {Object} advice
     */
    function Executor(target ,advice) {
        this.target = target || null;
        this.advice = advice || null;
    }

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

    /**
     * 请求处理类
     * @class Handler
     * @param {Object} executor
     */
    function Handler(executor) {
        this.executor = executor;
    }

    /**
     * create a handler instance
     */
    Handler.getInstance = function (obj, sFn) {
        var m = new Method(obj, sFn);
        return new Handler(m);
    };

    Handler.prototype = {

        /**
         * add a advice to this handler
         * @param {Object} advice
         * @return {Object} executor
         */
        add: function (advice) {
            this.executor = new Executor(this.executor, advice);
            return this.executor;
        },

        /**
         * remove a advice
         * @param {Object} advice
         * @return {Object} executor
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
            this.executor = er;
            return er;
        },

        /**
         * execute method
         * @return {any} executor.exec
         *
         * @see executor.exec
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

    var Aop = {};

    Aop.Method = Method;
    Aop.Halt = Halt;
    Aop.Prevent = Prevent;
    Aop.AlterArgs = AlterArgs;
    Aop.AlterReturn = AlterReturn;
    Aop.Advice = Advice;
    Aop.Executor = Executor;
    Aop.Handler = Handler;

    Host.Aop = Aop;

})(typeof exports === 'object' ? exports : this);
