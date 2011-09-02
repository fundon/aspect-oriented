/**
 * eventx file
 * Event Engine
 * supported Broadcast and Publish/Subscribe
 */
(function (Host) {
    var APUSH = Array.prototype.push,
        PATTERN = /(?:[\w\d\-_]+|\*)/g,
        PTYPE = '[\\w\\d\\-_]+',
        sguid = 0,
        parseType = function (type) {
            var pairs = type.split(':'),
                l = pairs.length,
                p0 = pairs[0] === '' ? '*' : pairs[0],
                p1 = (l - 1) && pairs[1] !== '' ? pairs[1] : '*';

            return p0 + ':' + p1;
        },
        genTypeReg = function (type) {
            var m = type.match(PATTERN),
                sreg = '(?:\\*|' + ((m[0] === '*') ? PTYPE : m[0]) +
                    ')\\:(?:\\*|' + ((m[1] === '*') ? PTYPE : m[1]) + ')';

            return new RegExp('^' + sreg + '$');
        };

    /**
     * 订阅类
     * @param {Object} instance
     * @param {Function} callback
     * @param {String} type
     * @return {Object} self
     */
    function Subscriber(instance, type, fn) {
        this.instance = instance;
        this.type = type;
        this.fn = fn;
        this.timestamp = +new Date();
    }

    /**
     * Event Target
     */
    function EventTarget() {
        this.subscribers = {};
    }

    EventTarget.prototype = {

        constructor: EventTarget,
        
        toString: function () {
            return '[object EventTarget]';
        },

        /**
         * @param {String} type
         * @param {Function} callback
         * @param {Object} context
         * @return {Object} self
         *
         * type: 
         *      1. '', '*', ':', '*:', ':*', '::' => 监听所有主题
         *      2. ':click', '*:click' => 监听所有 :click 的主题
         *      3. 'post', 'post:', 'post:*' => 监听 post 下的所有主题
         *      4. 'post:click' => 监听 post 下的 click 主题
         */
        on: function (type, fn, context) {
            context = context || this;
            type = parseType(type);

            var subscriber = new Subscriber(context, type, fn);

            (this.subscribers[type] = this.subscribers[type] || []).push(subscriber);

            return this;
        },

        /**
         * 订阅一次后移除
         * @param {String} type
         * @param {Object} context
         * @param {Function} callback
         * @return {Object} self
         *
         * type: 
         *      1. '', '*', ':', '*:', ':*', '::' => 监听所有主题
         *      2. ':click', '*:click' => 监听所有 :click 的主题
         *      3. 'post', 'post:', 'post:*' => 监听 post 下的所有主题
         *      4. 'post:click' => 监听 post 下的 click 主题
         */
        once: function (type, context, callback) {
            context = context || this;
            type = parseType(type);
            this.subscribers[type] = this.subscribers[type] || [];

            var subscriber = new Subscriber(context, type);
            subscriber.fn = function (L, subscribers, fn) {
                return function (data) {
                    fn.call(this, data);
                    var i = 0, l = subscribers.length;
                    for (; i < l;) {
                        if (L === subscribers[i++]) {
                            subscribers.splice(--i, 1);
                            l--;
                        }
                    }
                };
            }(subscriber, this.subscribers[type], callback);

            this.subscribers[type].push(subscriber);

            return this;
        },

        /**
         * @param {String} type
         * @param {Object} data
         * @param {Function} fn
         * @return {Object} self
         *
         * type: 
         *      1. '', '*', ':', '*:', ':*', '::' => 广播到所有主题
         *      2. ':click', '*:click' => 广播到所有 :click 的主题
         *      3. 'post', 'post:', 'post:*' => 广播到 post 下的所有主题
         *      4. 'post:click' => 广播 post 下的 click 主题
         */
        fire: function (type, data, callback) {
            type = parseType(type);

            var reg = genTypeReg(type),
                a = [], i = 0, k;

            for (k in this.subscribers) {
                if (reg.test(k)) {
                    APUSH.apply(a, this.subscribers[k]);
                }
            }

            while (a[i]) {
                a[i].fn.call(a[i++].instance, data);
            }

            if (callback) {
                callback.call(this);
            }

            return this;
        },

        /**
         * @param {String} type
         * @param {Function} fn
         * @param {Object} context
         * @return {Object} self
         *
         * type: 
         *      1. '', '*', ':', '*:', ':*', '::' => 删除所有主题
         *      2. ':click', '*:click' => 删除所有 :click 的主题
         *      3. 'post', 'post:', 'post:*' => 删除 post 下的所有主题
         *      4. 'post:click' => 删除 post 下的 click 主题
         */
        detach: function (type, context, callback) {
            context = context || this;
            type = parseType(type);

            var reg = genTypeReg(type),
                subscribers, k;

            for (k in this.subscribers) {
                if (reg.test(k)) {
                    subscribers = this.subscribers[k];
                    var i, l = subscribers.length;

                    while (subscribers[i = l - 1]) {
                        if (context === subscribers[i].instance) {
                            subscribers.splice(i, 1);
                        } 
                        l--;
                    }
                }
            }

            if (callback) {
                callback.call(this);
            }

            return this;
        },

        /**
         * clean all subscribers.
         */
        detachAll: function (context) {
            return this.detach('*:*', context);
        }
    };

    var Eventx = {};

    Eventx.Subscriber = Subscriber;

    Eventx.EventTarget = EventTarget;

    Host.Eventx = Eventx;

})(typeof exports === 'object' ? exports : this);
