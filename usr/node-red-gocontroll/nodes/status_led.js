module.exports = function(RED) {
    "use strict"

	const fs = require('fs');
	
	function GOcontrollStatusLed(config) {
	   RED.nodes.createNode(this,config);

	const ledConfig = config.led;

	var ledName = 'Status1';
	
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


	
	this.on('input', function(msg) {
		
		
			/* Control Red LED */
			if(msg["red"] == 1)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-r' + '/brightness','255');
			}
			else if (msg["red"] == 0)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-r' + '/brightness','0');
			}


			/* Control Green LED */
			if(msg["green"] == 1)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-g' + '/brightness','255');
			}
			else if(msg["green"] == 0)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-g' + '/brightness','0');
			}
			
			
			/* Control Blue LED */
			if(msg["blue"] == 1)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-b' + '/brightness','255');
			}
			else if(msg["blue"] == 0)
			{
				fs.writeFileSync('/sys/class/leds/'+ ledName + '-b' + '/brightness','0');
			}


        });
    }
	RED.nodes.registerType("Status-Led",GOcontrollStatusLed);
}
