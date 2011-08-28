var Aop = require('../lib/aop').Aop,
    Method = Aop.Method,
    Halt = Aop.Halt,
    Prevent = Aop.Prevent,
    AlterArgs = AlterArgs,
    AlterReturn = AlterReturn,
    Advice = Aop.Advice,
    Handler = Aop.Handler;

var appMethod = new Method({
    handle: function () {
        console.log(arguments);
        console.log('hi app')
        return 'hello world';
    }
}, 'handle');

var app = new Handler(appMethod);

var appAround1 = new Advice({name: 'app around 1'}, function (advice, args){
    console.log(this.name);
    //console.dir(advice);
    advice.handle.apply(advice, args);
    //var ret = advice.handle();
    console.log(this.name);
    //return ret;
}, 4);
app = app.addHandler(appAround1);
//app = app.removeHandler(appAround1);

var appAround2 = new Advice({name: 'app around 2'}, function (advice){
    console.log(this.name);
    //console.dir(advice);
    advice.handle();
    console.log(this.name);
}, 4);
app = app.addHandler(appAround2);

var appBefore1 = new Advice({name: 'app before 1'}, function (){
    console.log(this.name);
    //return new AlterArgs('ahah', [4, 5, 6])
    //console.log(arguments)
    //return new Halt('s', 1);
    //return new Prevent('stop');
}, 1);
app = app.addHandler(appBefore1);

var appBefore2 = new Advice({name: 'app before 2'}, function (){
    console.log(this.name);
    return new Prevent('Stop..')
    //console.log(arguments)
    //return new Halt('s', 1);
    //return new Prevent('stop');
}, 1);
app = app.addHandler(appBefore2);

var appAfter1 = new Advice({name: 'app after 1'}, function (){
    console.log(this.name);
    return new Halt('111', '33333');
}, 2);
app = app.addHandler(appAfter1);

var appAfter2 = new Advice({name: 'app after 2'}, function (){
    console.log(this.name, ' : appAfter2.');
    return new Halt('111', '222222');
}, 2);
app = app.addHandler(appAfter2);

var appAfter3 = new Advice({name: 'app after 3'}, function (){
    console.log(this.name, ' : appAfter3.');
    //return new Halt('111', '44444');
}, 2);
app = app.addHandler(appAfter3);

console.log(app.handle());

console.log('----------')

app = app.removeHandler(appBefore1);
app = app.removeHandler(appBefore2);
//app = app.removeHandler(appAfter1);
//app = app.removeHandler(appAfter2);
app = app.removeHandler(appAround1);
app = app.removeHandler(appAround2);

console.log(app.handle(1, 2, 3));
