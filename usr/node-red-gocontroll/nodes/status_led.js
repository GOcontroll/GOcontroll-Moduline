module.exports = function(RED) {
    "use strict"

	function GOcontrollStatusLed(config) {
	   RED.nodes.createNode(this,config);

	const ledConfig = config.led;

	var ledName = 'Status1';

	var Led = require('led');
	
	if(ledConfig === 'LED 1')
	{
	ledName = 'Status1';
	}
	if(ledConfig === 'LED 2')
	{
	ledName = 'Status2'	;
	}
	if(ledConfig === 'LED 3')
	{
	ledName = 'Status3'	;
	}
	if(ledConfig === 'LED 4')
	{
	ledName = 'Status4';
	}


	const ledRed = new Led(ledName + '-r');
	const ledGreen = new Led(ledName + '-g');
	const ledBlue = new Led(ledName + '-b');
	
	this.on('input', function(msg) {
		
		
	/* Control Red LED */
	if(msg["red"] == 1)
	{
		ledRed.on();
	}
	else if (msg["red"] == 0)
	{
		ledRed.off();
	}


	/* Control Green LED */
	if(msg["green"] == 1)
	{
		ledGreen.on();
	}
	else if(msg["green"] == 0)
	{
		ledGreen.off();
	}
	
	
	/* Control Blue LED */
	if(msg["blue"] == 1)
	{
		ledBlue.on();
	}
	else if(msg["blue"] == 0)
	{
		ledBlue.off();
	}


        });
    }
	RED.nodes.registerType("Status-Led",GOcontrollStatusLed);
}
