/**
 * aop file
 * 使用 AOP 处理函数调用
 * 一些方法参考 yui3/event-do.js
 */
(function (exports) {
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
     * @param {Object} Advice
     * @param {Function} fn
     * @param {Number} e eventcode = {before: 1, after: 2, around: 4}
     */
    function Advice(advice, fn, e) {
        // default before event
        var et = Advice.eventTypes[e >> 1];
        if (!et) {
            return false; 
        }
        this.target = advice;
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
    function Handler(target ,advice) {
        this.target = target || null;
        this.advice = advice || null;
    };

    Handler.prototype = {

        /**
         * @method addHandler
         * @param {Object} advice
         * @return {Object} Handler 实例
         */
        addHandler: function (advice) {
            return new Handler(this, advice);
        },

        /**
         * 执行函数
         * @method handle
         * @param {any} arg*
         * @return {any} ret
         */
        handle: function () {
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
                        ret = target.handle.apply(target, args);
                    }

                    // execute after method
                    newRet = advice.after(target, args);
                    if (newRet) {
                        switch (newRet.constructor) {
                            case Halt:
                                return newRet.retVal;
                            case AlterReturn:
                                ret = newRet.newRetVal;
                        }
                    }
                }

            } else {
                ret = target.exec.apply(target, args);
            }

            return ret;
        },

        /**
         * 删除 advice
         * @method removeHandler
         * @param {Object} advice
         * @return {Object} Method/Advice 实例
         */
        removeHandler: function (advice) {
            var self = this;
            if (this.advice) {
                if (this.advice === advice) {
                    self = this.target;
                } else {
                    this.target = this.target.removeHandler(advice);
                }
            }
            return self;
        }
    };

    var Aop = {};

    Aop.Method = Method;
    Aop.Halt = Halt;
    Aop.Prevent = Prevent;
    Aop.AlterArgs = AlterArgs;
    Aop.AlterReturn = AlterReturn;
    Aop.Advice = Advice;
    Aop.Handler = Handler;

    exports.Aop = Aop;

})(exports);
