var Aop = require('../lib/aop2').Aop,
    Method = Aop.Method,
    Halt = Aop.Halt,
    Prevent = Aop.Prevent,
    AlterArgs = AlterArgs,
    AlterReturn = AlterReturn,
    Advice = Aop.Advice,
    Executor = Aop.Executor,
    Handler = Aop.Handler;

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
h.after(function (){
    console.log(this.name)
}, {name: 'app after 1'});

h.before(function (){
    console.log(this.name)
}, {name: 'app before 1'});

//console.dir(h);

h.exec(1,2,3);
