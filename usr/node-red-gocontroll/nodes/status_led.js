module.exports = function(RED) {
    "use strict"

	var i2c = require('i2c-bus');
	
	function GOcontrollStatusLed(config) {
	RED.nodes.createNode(this,config);

	const ledConfig = config.led;
	
	var ledRed 		= 0x0B;
	var ledGreen 	= 0x0C;
	var ledBlue 	= 0x0D;
	
	
	/* Define the different addresses for the LED's */
	if(ledConfig === 'LED 1')
	{
	ledRed 		= 0x0B;
	ledGreen 	= 0x0C;
	ledBlue 	= 0x0D;
	}
	if(ledConfig === 'LED 2')
	{
	ledRed 		= 0x0E;
	ledGreen 	= 0x0F;
	ledBlue 	= 0x10;
	}
	if(ledConfig === 'LED 3')
	{
	ledRed 		= 0x11;
	ledGreen 	= 0x12;
	ledBlue 	= 0x13;
	}
	if(ledConfig === 'LED 4')
	{
	ledRed 		= 0x14;
	ledGreen 	= 0x15;
	ledBlue 	= 0x16;
	}



	/* Create dataholder for I2C object */
	var i2c1;
	
	var	sendBuffer = Buffer.alloc(10);
	
	var ADDRESS = 0x14;
	
	/* Open specific I2C port */
	i2c1 = i2c.openSync(2);
	
	/* First, reset the device */
	sendBuffer[0] = 0x17;
	sendBuffer[1] = 0xFF;
	i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
	
	/* Second, enable the device (Chip_EN)*/
	sendBuffer[0] = 0x00;
	sendBuffer[1] = 0x40;
	i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
	
	/* Close the I2C port */
	i2c1.closeSync();
	
	this.on('input', function(msg) {
		
		/* Open specific I2C port */
		i2c1 = i2c.openSync(2);
				
			/* Control Red LED */
			if(msg["red"] >= 0 && msg["red"] <= 255)
			{
			sendBuffer[0] = ledRed;
			sendBuffer[1] = msg["red"];
			i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
			}
			
			if (msg["green"] >= 0 && msg["green"] <= 255)
			{
			sendBuffer[0] = ledGreen;
			sendBuffer[1] = msg["green"];
			i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
			}

			if (msg["blue"] >= 0 && msg["blue"] <= 255)
			{
			sendBuffer[0] = ledBlue;
			sendBuffer[1] = msg["blue"];
			i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
			}
			
		/* Close the I2C port */	
		i2c1.closeSync();	
        });
    }
	RED.nodes.registerType("Status-Led",GOcontrollStatusLed);
}
