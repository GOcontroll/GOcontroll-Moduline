module.exports = function(RED) {
    "use strict"

	function GOcontrollStatusLed(config) {
	   RED.nodes.createNode(this,config);

	this.led = config.led;
	this.color = config.color;
	
	var ledName = 'Status1';
	var ledColor = '-b'; 
	
	var Led = require('led');
	
	if(this.led === 'LED 1')
	{
	ledName = 'Status1'	
	}
	if(this.led === 'LED 2')
	{
	ledName = 'Status2'	
	}
	if(this.led === 'LED 3')
	{
	ledName = 'Status3'	
	}
	if(this.led === 'LED 4')
	{
	ledName = 'Status4'	
	}
	
	if(this.color === 'Red')
	{
	ledColor = '-r'	
	}
	if(this.color === 'Green')
	{
	ledColor = '-g'	
	}
	if(this.color === 'Blue')
	{
	ledColor = '-b'	
	}	
	
	
	
	
	const led = new Led(ledName + ledColor);
	
	this.on('input', function(msg) {

	if(msg.payload == 'on' || msg.payload == 1)
	{
	led.on();
	}
	else
	{
	led.off();
	}
            msg.payload = this.color;
            this.send(msg);
        });
    }
	RED.nodes.registerType("Status-Led",GOcontrollStatusLed);
}
