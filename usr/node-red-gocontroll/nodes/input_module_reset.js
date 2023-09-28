module.exports = function(RED) {
    "use strict"
	
	const spi = require('spi-device');
	
	var MESSAGELENGTH = 0;
	const SPISPEED = 2000000;
	
	function GOcontrollInputModuleReset(config) { 	 
	   RED.nodes.createNode(this,config);
	   
	   /* Get information from the Node configuration */
		const moduleSlot 	= parseInt(config.moduleSlot);
		const moduleType	= config.moduleType; 
		const channel6 		= config.channel6;
		const channel10 	= config.channel10;
        var node 			= this;
		
		var channel; 
		var sL, sB;
		
		/* Assign information according module type */
		/* In case 6 channel input module is selected */
		if(moduleType == 1){
			MESSAGELENGTH 	= 55;
		/* In case 10 channel input module is selected */
		}else{
			MESSAGELENGTH 	= 50;
		}
		
		/*Execute initialisation steps */
		/*Define the SPI port according the chosen module */
		switch(moduleSlot)
		{
			case 1: sL = 1; sB = 0;    break;
			case 2: sL = 1; sB = 1;    break;
			case 3: sL = 2; sB = 0;    break;
			case 4: sL = 2; sB = 1;    break;
			case 5: sL = 2; sB = 2;    break;
			case 6: sL = 2; sB = 3;    break;
			case 7: sL = 0; sB = 0;    break;
			case 8: sL = 0; sB = 1;    break;
		}
		
			/***execution initiated by event *******/
			node.on('input', function(msg) {

			var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
			var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
		
			sendBuffer[0] = moduleSlot;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer[2] = 1;
			
			if(moduleType == 1){ /* In case 6 channel module is selected */
			sendBuffer[3] = 11;
			sendBuffer[6] = channel6;
			channel = channel6;
			}else{ /* In case 10 channel module is selected */
			sendBuffer[3] = 12;
			sendBuffer[6] = channel10;
			channel = channel10;
			}
			
			sendBuffer[4] = 3;
			sendBuffer[5] = 2;
			
			if(msg["pulscounterValue"] >= -2147483640 && msg["pulscounterValue"] <= 2147483640)
			{
			
			sendBuffer.writeInt32LE(msg["pulscounterValue"], 7);	
			}
			else{
				node.warn("Reset counter value of module "+ String(moduleSlot) + "channel "+ String(channel) +" is outside range."); 
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