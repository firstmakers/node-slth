/**
 * Created by eDelgado on 09-10-14.
 */
var  Slth = require('./lib/SlthClient.js')
var client = new Slth();


client.thingSpeakSetting({
    channel : 17536,
    apiWriteKey :'your Write Key',
    apiReadKey : 'your Read Key (opcional)'
});
//paso parámetro de intervalo de medición
client.init(1);
