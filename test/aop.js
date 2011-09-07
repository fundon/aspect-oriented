var Aop = require('../lib/aop').Aop,
    Eventx = require('../lib/eventx').Eventx,
    Method = Aop.Method,
    Halt = Aop.Halt,
    Prevent = Aop.Prevent,
    AlterArgs = AlterArgs,
    AlterReturn = AlterReturn,
    Advice = Aop.Advice,
    Executor = Aop.Executor,
    Handler = Aop.Handler;
    EventTarget = Eventx.EventTarget;

var app = new Method({
    handle: function () {
        console.log(arguments);
        console.log('hi app')
        return 'hello world';
    }
}, 'handle');

var h = new Handler(app);

var appAround1 = new Advice({name: 'app around 1'}, function (advice, args){
    console.log(this.name);
    //console.dir(advice);
    advice.exec.apply(advice, args);
    //var ret = advice.handle();
    console.log(this.name);
    //return ret;
}, 4);

h.add(appAround1);

var appAround2 = new Advice({name: 'app around 2'}, function (advice){
   console.log(this.name);
    //console.dir(advice);
    advice.exec();
    console.log(this.name);
}, 4);

h.add(appAround2);
h.remove(appAround2);
h.remove(appAround1);
//console.log(h.after)
h.after(function (){
    console.log(this.name)
}, {name: 'app after 1'});

h.after(function (){
    console.log('after...do some thing...')
    return new Halt('dd', 789);
});

/*
var ba = new Advice({name: 'app before and after'}, function (advice){
    console.log('before')
    console.log(this.name);
    console.log('after')
}, 3);

h.add(ba);
*/

// including before-event and after-event
h.inject(3, function() {
    console.log('inject before and after.')
});

h.before(function (){
    console.log(this.name)
}, {name: 'app before 1'});

console.dir(h);

console.log(h.exec(1,2,3));

console.log('\n----------- EventTarget');

var sandbox = new EventTarget();

console.dir(sandbox);
sandbox.on('post:click', function (data) {
    console.log('post:click');
});

sandbox.once('post:click', function (data) {
    console.log('once1 post:click');
});

sandbox.once('post:click', function (data) {
    console.log('once2 post:click');
});

sandbox.fire('post:click');
sandbox.fire('post:click');

var sandbox1 = new EventTarget();

var o = {
    on: function () {
        console.log('sandbox1 on ... ')
        return sandbox1.on.apply(sandbox1, arguments);
    }
};

var hm = Handler.getInstance(o, 'on');

hm.after(function(){
    console.log('after ...');
});

hm.before(function(){
    console.log('before ...');
});

hm.around(function(advice, args){
    console.log('around ...');
    advice.exec.apply(advice, args);
    console.log('around ...');
});

hm.exec('post:change', function(){
    console.log('hm - post:change ...');
});

hm.exec('post:click', function(){
    console.log('hm - post:click ...');
});

sandbox1.once('post:click', function() {
    console.log('once -- post:click');
});

hm.exec(':click', function(){
    console.log('hm - :click ...');
});

sandbox1.fire(':click');
console.log('-------------- file again!');
sandbox1.fire(':click');
