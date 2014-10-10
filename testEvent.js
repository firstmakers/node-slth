/**
 * Created by eDelgado on 09-10-14.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var ModuleA = function() {
    this.init();
};

util.inherits(ModuleA, EventEmitter);

ModuleA.prototype.init = function() {
    this.on('done', function() {
        console.log('done');
    });
}

ModuleA.prototype.doSomething = function() {
    this.emit('done');
};


var foo = new ModuleA();
foo.doSomething(); // => logs 'done'