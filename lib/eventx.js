/**
 * eventx file
 * Event Engine
 * supported Broadcast and Publish/Subscribe
 */
(function (Host) {
    var APUSH = Array.prototype.push,
        hasOwn = Object.prototype.hasOwnProperty,
        PATTERN = /^([\w\d\-_]+|\*)?(\:)?([\w\d\-_]+|\*)?$/,
        SPATTERN = PATTERN.toString(),
        WC = '*', //wildcard
        C = ':', //colon

        hashMaps = {
            ts: {}, // store types
            rs: {}  // store regexps
        },

        parseType = function (M) {
            return function (type) {
                if (!hasOwn.call(M, type)) {
                    var p = PATTERN.exec(type),
                        s = (p[1] || WC) + (p[2] || C) + (p[3] || WC);

                    M[type] = s;
                }
                return M[type];
            };
        }(hashMaps.ts),

        genTypeReg = function (M) {
            var PT = /(?:\[\\w\\d\\-_\]\+)/g;
            return function (type) {
                if (!hasOwn.call(M, type)) {
                    var p = parseType(type).split(C), i = 0,
                        s = SPATTERN.replace(PT, function ($1/*, $2*/) {
                            return (p[i++] !== WC && p[i-1]) || $1;
                        });
                    
                    s = s.substr(1, s.length - 2).replace(/\\/g, '\\');

                    M[type] = new RegExp(s);
                }
                return M[type];
            };
        }(hashMaps.rs);

    /**
     * Subscriber Class
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
         * subcribe a channel
         * @param {String} type
         * @param {Function} fn
         * @param {Object} context
         * @return {Object} self
         *
         * type:
         *      1. '', '*', ':', '*:', ':*', '::' => subscribe all channels
         *      2. ':click', '*:click' => subcribe all channels's click tpoics
         *      3. 'post', 'post:', 'post:*' => subcribe post channel all topics
         *      4. 'post:click' => subcribe post channel click tpoic
         */
        on: function (type, fn, context) {
            context = context || this;
            type = parseType(type);

            var subscriber = new Subscriber(context, type, fn);

            (this.subscribers[type] = this.subscribers[type] || []).push(subscriber);

            return this;
        },

        /**
         * subcribe a channel, once
         * @param {String} type
         * @param {Object} context
         * @param {Function} callback
         * @return {Object} self
         *
         * @see on
         */
        once: function (type, callback, context) {
            context = context || this;
            type = parseType(type);
            this.subscribers[type] = this.subscribers[type] || [];

            var self = this,
                subscriber = new Subscriber(context, type);

            subscriber.fn = function (L, subscribers, fn) {
                return function (data) {
                    fn.call(this, data);
                    self._del(type, subscriber);
                };
            }(subscriber, this.subscribers[type], callback);

            this.subscribers[type].push(subscriber);

            return this;
        },

        /**
         * delete a subscriber from channel
         * @param {String} type
         * @param {Object} subscriber
         */
        _del: function (type, subscriber) {
            var subscribers = this.subscribers[type],
                i = 0, sub;

            for (; sub = subscribers[i++]; ) {
                if (subscriber === sub) {
                    subscribers.splice(--i, 1);
                }
            }
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
