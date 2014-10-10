/**
 * Created by eDelgado on 09-10-14.
 */
var  Slth = require('./lib/Slth.js');


start();

function start (){
    var device = new Slth();

    if(device.connected){
        console.log(device.count());
        device.setInterval(1);
        device.start();
        setTimeout(device.stop, 2000 * 1000);
        console.log("Total of Samples " +device.numberOfSamples());
    }


    // Evento nueva medición
    device.on('newSample', function(data){
        console.log(
                device.numberOfSamples()+"\t"+
                data.temperature+ " ºc " + "\t" +
                data.light+" lux " + "\t" +
                data.humidity + " hs" );
    });

    // Evento slth desconectado
    device.on('detached', function(e){
        console.log("Slth is detached");
    });

    // Evento slth conectada
    device.on('attached', function(dev){
        // auto start
        device.start();
    });
}
