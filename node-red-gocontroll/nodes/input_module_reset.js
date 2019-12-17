module.exports = function(RED) {
    "use strict"
	
	const spi = require('spi-device');
	
	const MESSAGELENGTH = 55;
	const SPISPEED = 2000000;
	
	function GOcontrollInputModuleReset(config) { 	 
	   RED.nodes.createNode(this,config);
	   
		this.moduleLocation = config.moduleLocation;
	
		this.channel = config.channel;

        var node = this;
		
		var sL, sB;
		
		/*Execute initialisation steps */
		/*Define the SPI port according the chosen module */
		switch(this.moduleLocation)
		{
			case "1": sL = 1; sB = 0;    break;
			case "2": sL = 1; sB = 1;    break;
			case "3": sL = 2; sB = 0;    break;
			case "4": sL = 2; sB = 1;    break;
			case "5": sL = 2; sB = 2;    break;
			case "6": sL = 2; sB = 3;    break;
			case "7": sL = 0; sB = 0;    break;
			case "8": sL = 0; sB = 1;    break;
		}
		
			/***execution initiated by event *******/
			node.on('input', function(msg) {

			var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
			var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
		
			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer[2] = 3;
			
			if(msg.payload.pulscounterValue >= -2147483640 && msg.payload.pulscounterValue <= 2147483640)
			{
			sendBuffer[6] = node.channel;
			sendBuffer.writeInt32LE(msg.payload.pulscounterValue, 7);	
			}
			else{
				node.warn("Reset counter value of module "+ node.moduleLocation+ "channel "+node.channel+" is outside range."); 
				return;
			}
			
			sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
				const inputModuleReset = spi.open(sL,sB, (err) => {

				  const message = [{
					sendBuffer, 
					receiveBuffer,           
					byteLength: MESSAGELENGTH+1,
					speedHz: SPISPEED 
				  }];
				  inputModuleReset.transfer(message, (err, message) => {
				});
			});
		});
	}

	RED.nodes.registerType("Input-Module-Reset",GOcontrollInputModuleReset);

	/*Function to calculate the checksum of a message that needs to be send */
	function ChecksumCalculator(array, length)
	{
	var pointer = 0;
	var checkSum = 0;
		for (pointer = 0; pointer<length; pointer++)
		{
		checkSum += array[pointer];
		}
	return (checkSum&255);	
	}
	
	
}