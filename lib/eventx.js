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

        _cached: {},

        _getCache: function (type) {
            var reg = genTypeReg(type), k;
            if (!this._cached[type]) {
                this._cached[type] = [];
                for (k in this.subscribers) {
                    if (reg.test(k)) {
                        this._cached[type].push(this.subscribers[k]);
                    }
                }
            }
            return this._cached[type];
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

            subscriber.fn = function (data) {
                callback.call(this, data); 
                self._del(type, subscriber);
            }

            this.subscribers[type].push(subscriber);

            return this;
        },

        /**
         * delete a subscriber from channel
         * @param {String} type
         * @param {Object} subscriber
         */
        _del: function (type, subscriber) {
            var subs = this.subscribers[type],
                i = 0;
            for (; subs[i]; ) {
                if (subs[i++] === subscriber) {
                    subs.splice(--i, 1);
                }
            }
        },

        /**
         * @param {String} type
         * @param {Object} data
         * @param {Function} fn
         * @return {Object} self
         *
         * @see on
         */
        fire: function (type, data, callback) {
            var s = this._getCache(type),
                i = 0, j = 0, l;

            while (s[i]) {
                l = s[i].length;

                (!l) && (i++) && (j = 0);

                s[i][j] && s[i][j].fn.call(s[i][j].instance, data);

                (l === s[i].length) && (++j);

                (j === s[i].length) && (++i) && (j = 0);
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
         * @see on
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
