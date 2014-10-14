/**
 * Created by eDelgado on 13-10-14.
 */

var  Slth = require('./Slth.js');
var ThingSpeakClient = require('thingspeakclient');


//private attributes
var _device;
var self;
var _settings = {};
var _thingSpeak;
var _lastTemperature = 0,_lastLight = 0, _lastHumidiy = 0,
    _avrTemperature, _avrLight , avrHumidity;

var _pusher;


//Public Class
var SlthClient = function(){
    self = this;
    _device = new Slth();
    _thingSpeak = new ThingSpeakClient({useTimeoutMode:false}); // disable client timeout handling between update request per channel

    this.init = function(interval){

        if(_device.connected){
            _device.setInterval(interval);
            _device.start();
            _pusher = setInterval(updateDataStream , 15000);
        }
        // Evento nueva medición
        _device.on('newSample', function(data){
            onDataReceived(data);
        });
        // Evento slth desconectado
        _device.on('detached', function(device){
            onDeviceDetached(device);
        });
        // Evento slth conectada
        _device.on('attached', function(device){
            onDeviceAttach(device);
        });

    }
    this.setChannel = function(cnl){
        _settings : {
            channel = cnl
        }
    }
    this.setApikeys = function(writeKey, readKey){
        _settings : {
            apiWriteKey = writeKey,
            apiReadKey  = readKey
        }
    }
    this.thingSpeakSetting = function (setting){
        _settings = setting
        _thingSpeak.attachChannel(
            _settings.channel ,
            { writeKey:_settings.apiWriteKey},
            function(err,res){
                if(err)
                    console.log(err);
                if(!err && res)
                    console.log(res);
            });
    }
}


function onDataReceived(data){

    _lastTemperature = data.temperature;
    _lastLight = data.light;
    _lastHumidiy = data.humidity;

    console.log(_device.numberOfSamples() + "\t" +
                data.temperature + " ºc " + "\t" +
                data.light + " lux " + "\t" +
                data.humidity + " hs");
}

function updateDataStream(){

    _thingSpeak.updateChannel(_settings.channel , {
            field1: _lastTemperature,
            field2: _lastLight,
            field3: _lastHumidiy
        },
        function(err, resp) {
        if (!err && resp > 0) {
            console.log('Update successfully. Entry number was: ' + resp);
        }
        else if(err){
            console.log('Error :' + err);
        }
    });
}

function onDeviceAttach (device) {
    _device.start();
}

function onDeviceDetached(device) {

}

module.exports = SlthClient;