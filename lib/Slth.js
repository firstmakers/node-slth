/**
 * Created by eDelgado on 09-10-14.
 */
'use strict'

var USB = require('node-hid');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

//Private attributes

var _vendorID = 1240;
var _productID = 63;
var _self;
var _device;
var _sampler;
var _command = [0x87];
var _interval;
var _numOfSamples = 0;
var _errorSamples = 0;


// Public class
var Slth = function () {
    _self = this;
    _self.devices = getFriendlyDevices();
    _interval = 1000;
    _self.connected = false;
    _self.monitoring = false;

    if(_self.devices.length > 0){
        connect(_self.devices[0].path); //connecta el primer dispositivo
    }
    else {
        console.log("SLTH not found");
        slthDetector(true);
    }

    /*  Public Methods

    */

    /**Obtiene un array con todos los
    * dispositivos Slth conectados **/
    Slth.prototype.getDevices = function(){
        return _self.devices = getFriendlyDevices();
    }

    /**Obtiene el número de dispositivos Slth conectados ***/
    Slth.prototype.count = function(){
        return _self.devices.length;
    }

    /**Asigna un nuevo valor de intervalo de muestreo,
     * el valor debe ser expresado en segundos **/
    Slth.prototype.setInterval = function(int){
        if(int > 0) {
            _interval = int * 1000;
        }
    }

    /**
     * Detiene el monitoreo
     * */
    Slth.prototype.stop = function(){
        stopMonitor();
    }

    /***
     * Comienza un nuevo monitoreo
     */
    Slth.prototype.start = function(){
        if(_self.connected)
            startMonitor(_command, _interval);
    }

    Slth.prototype.numberOfSamples = function(){
        return _numOfSamples;
    }
    Slth.prototype.readingErrors = function(){
        return _errorSamples;
    }
}

/*

* Private methods

*/

/**
 * Filtra los dispositivos conectados
 * según el parámetro friendlyDevice
 */
function getFriendlyDevices(){

    var pathDevices = USB.devices(_vendorID, _productID);
    /*if(!pathDevices.length)
        throw new Error("SLTH not Found");*/
    return pathDevices;
}

/**
 * Escribe el comando actual sobre la Slth
*/
function writeUsb(){
    try{
        _device.write(_command);
    }catch (e){
        console.log(e.toString());
    }
}

/**
 * Analiza la cadena de bytes que responde
 * la Slth cada vez que se le envía un comando,
 * Retorna los valores expresados en celsius, lux y humedad
 * **/
function newData(d){
    var tmp = getCelsius(d, 1);
    var luz = getLux(d, 3);
    var hum = getHumidity(d , 5);

    var data =
    {
        temperature: tmp,
        light: luz,
        humidity: hum
    };
    return data;
}

/**
 * Establece la comunicación con la Slth
 */
function connect (path){
    console.log("Connecting to " + path);
    try{
        _device = new USB.HID(path);
        _self.connected = true;
        console.log("Slth connected");
    }catch (e){
        console.log("Fail connection :"+ e.toString());
        _self.connected = false;
        return;
    }

    _device.on("data", function(data) {
        _numOfSamples++;
        data = newData(data);
        _self.emit('newSample', data);

    });
    _device.on("error", function(err) {
        _errorSamples++;
        //_self.emit('dataError', err);
        if(!verifySlthConnection()) {
            stopMonitor();
            disconnect();
        }
    });
}

/**
* Verifica si hay slth conectadas,
*/

function verifySlthConnection(){
    var devices = getFriendlyDevices();
    if(devices.length > 0){
        connect(devices[0].path);
        slthDetector(false);
        return true;
    }
    else{
        _self.emit('detached', _device)
        slthDetector(true);
        return false;
    }
}

/**
 * Detecta la conexión de las slth
 * en las puertas usb, cada vez que encuentra
 * un dispositivo trata de autoconectarse con el mismo,
 * detiene la deteccion y emite el evento 'attached'
 * para notificar que ha detectado una tarjeta.
 *
 * recibe un boleano para iniciar o detener la
 * detección (true, false respectivamente)
 */
function slthDetector(bol) {
    var detector ;
    if(bol) {
        console.log('detector is running');
        detector = setInterval(function (){
            var devices = getFriendlyDevices();
            if(devices.length > 0) {
                connect(devices[0].path);
                clearInterval(detector);
                _self.emit('attached', devices[0]);
            }
        }, 500);
    }else{
        clearInterval(detector);
        console.log('detector is stopped');
    }
}

/**
 * Comienza el monitoreo sobre la tarjeta
 */
function startMonitor (command , int){
    _self.monitoring = true;
    _interval = int;
    writeUsb();
    _sampler = setInterval( writeUsb, _interval);
    console.log("Monitor on : command " + command);
}

/**
 * Cierra la conexión con el dispositivo
 */
function disconnect(){
    if(_device) {
        _device.close();
        _self.connected = false;
        _self.monitoring = false;
    }
    console.log("Close slth connection");
}

/**
 * Detiene un monitoreo en curso
 */
function stopMonitor(){
    _self.monitoring = false;
    if(_sampler)
        clearInterval(_sampler);
    console.log("Monitor off");
}


/**
 * Transforma la medición de humedad a escala lineal con 400 ->0  & 800 -> 10
 */
var getHumidity = function(rawData, index){
    var hum = ((rawData[index + 1] << 8) + rawData[index]);
    hum = 10*(hum-400)/400;
    hum = hum > 10 ? 10 : hum;
    return Math.round(hum *100)/100;
}
/**
 * Transforma la medición de luminosidad a lux.
 */
var getLux = function(rawData, index){
    var lux = ((rawData[index + 1] << 8) + rawData[index]);
    lux = lux*1.2;
    return Math.round(lux*100)/100;
}/* end getLux*/

/**
 * Transforma la muestra de medición en grados celsius,
 * incluye transformacion de temperaturas negativas.
 * Retona 0 cuando el sensor de temperatuura se encuentra
 * desconectado.
 */
var getCelsius = function(rawData, index){
    var celsius = ((rawData[index + 1] << 8) + rawData[index]);
    //La sonda de temperatura está desconectada
    if(celsius === 32767){
        //if(debugging)
        //console.log("Error : The temperature sensor is disconnected. ");
        celsius = 0;
    }
    //la temperatura es negativa, se aplica complemento a 2
    else if(celsius > 32767){
        //invierte los bit del entero sin signo para obtener el número negativo con signo
        celsius = celsius ^ parseInt((new Array(celsius.toString(2).length+1)).join("1"),2);
        celsius = - (celsius+1)/16;

    }
    //temperatura positiva
    else{
        celsius = (celsius * 0.0625);
    }
    return Math.round((celsius) * 100)/100 ; //retorna la temp con 2 decimales.
}/*end getCelsius*/





module.exports = Slth;
util.inherits(Slth, EventEmitter);


