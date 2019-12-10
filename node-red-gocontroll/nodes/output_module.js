module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	var ModuleReset = require('led');
	
	var MESSAGELENGTH = 44;
	var SPISPEED = 2000000;
	
	var output1 = 0;
	var output2 = 0;
	var output3 = 0;
	var output4 = 0;
	var output5 = 0;
	var output6 = 0;
	
	function GOcontrollOutputModule(config) { 	 
	   RED.nodes.createNode(this,config);
	   
		this.moduleLocation = config.moduleLocation; 
		this.sampleTime = config.sampleTime;
		this.output1 = config.output1;
		this.freq1 = config.freq1;
		this.output2 = config.output2;
		this.freq2 = config.freq2;
		this.output3 = config.output3;
		this.freq3 = config.freq3;
		this.output4 = config.output4;
		this.freq4 = config.freq4;
		this.output5 = config.output5;
		this.freq5 = config.freq5;
		this.output6 = config.output6;
		this.freq6 = config.freq6;
        var node = this;
		
		var sL, sB;
		
		/*Allocate memory for receive and send buffer */
		var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
		var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
		
		var spiReady = 0;
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

		/*Create the module reset identifier and the convert the sampletime */
		const moduleReset = new ModuleReset("ResetM-" + String(this.moduleLocation));			
		const sampleTime = parseInt(this.sampleTime);
	
		/*Start module reset */
		moduleReset.on();
		
		/*Give a certain timeout and generate callback*/
		setTimeout(resetModule, 10);
		
		/*Callback reset handler to get module out of reset */
		function resetModule (){
			moduleReset.off();
			/*After reset, give the module some time to boot */
			setTimeout(initializeModule, 800);
		}
		
			/*At this point, device is booted so send the initialization data */
			function initializeModule (){

			
			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH;
			sendBuffer[2] = 101;
			sendBuffer[6] = (node.freq1&15)|((node.output1&15)<<4);
			sendBuffer[7] = (node.freq2&15)|((node.output2&15)<<4);
			sendBuffer[8] = (node.freq3&15)|((node.output3&15)<<4);
			sendBuffer[9] = (node.freq4&15)|((node.output4&15)<<4);
			sendBuffer[10] = (node.freq5&15)|((node.output5&15)<<4);
			sendBuffer[11] = (node.freq6&15)|((node.output6&15)<<4);
					
			sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
				const outputModule = spi.open(sL,sB, (err) => {

				  const message = [{
					sendBuffer,//: Buffer.from(dataToSend), 
					receiveBuffer,//: Buffer.from(dataToReceive),             
					byteLength: MESSAGELENGTH+1,
					speedHz: SPISPEED 
				  }];

				  outputModule.transfer(message, (err, message) => {
				  });
				  
				});
			}
			
			
			
		/* open SPI device for communication */
		var outputModule = spi.open(sL,sB, (err) => {
			if(!err)
			{
				spiReady = true;
			} 
		});
		
			  var message = [{
				sendBuffer, 
				receiveBuffer,           
				byteLength: MESSAGELENGTH+1,
				speedHz: SPISPEED 
			  }];

			/***execution initiated by event *******/
			node.on('input', function(msg) {
				
			if(!spiReady)
			{
				return;
			}



			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer[2] = 102;
			
			if(msg.payload.outputChannel1 >= 0 &&  msg.payload.outputChannel1 <= 1000)
			{
			output1 = msg.payload.outputChannel1	
			}
			if(msg.payload.outputChannel2 >= 0 &&  msg.payload.outputChannel2 <= 1000)
			{
			output2 = msg.payload.outputChannel2	
			}
			if(msg.payload.outputChannel3 >= 0 &&  msg.payload.outputChannel3 <= 1000)
			{
			output3 = msg.payload.outputChannel3	
			}
			if(msg.payload.outputChannel4 >= 0 &&  msg.payload.outputChannel4 <= 1000)
			{
			output4 = msg.payload.outputChannel4	
			}
			if(msg.payload.outputChannel5 >= 0 &&  msg.payload.outputChannel5 <= 1000)
			{
			output5 = msg.payload.outputChannel5	
			}
			if(msg.payload.outputChannel6 >= 0 &&  msg.payload.outputChannel6 <= 1000)
			{
			output6 = msg.payload.outputChannel6	
			}
			
			sendBuffer.writeUInt16LE(output1, 6);
			sendBuffer.writeUInt16LE(output2, 12);
			sendBuffer.writeUInt16LE(output3, 18);
			sendBuffer.writeUInt16LE(output4, 24);
			sendBuffer.writeUInt16LE(output5, 30);
			sendBuffer.writeUInt16LE(output6, 36);
			
			sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			
				  outputModule.transfer(message, (err, message) => {
					if(receiveBuffer[MESSAGELENGTH-1] === ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{
						/*In case dat is received that holds module information */
						if(receiveBuffer.readInt32LE(2) === 103)
						{
							msg.payload = {
							"moduleTemperature": receiveBuffer.readInt16LE(6),
							"moduleGroundShift": receiveBuffer.readUInt16LE(8),
							"currentChannel1": receiveBuffer.readUInt16LE(10),
							"currentChannel2": receiveBuffer.readUInt16LE(12),
							"currentChannel3": receiveBuffer.readUInt16LE(14),
							"currentChannel4": receiveBuffer.readUInt16LE(16),
							"currentChannel5": receiveBuffer.readUInt16LE(18),
							"currentChannel6": receiveBuffer.readUInt16LE(20)
							}	
						node.send(msg);	
						}
					}
				});
			
		});
	}

	RED.nodes.registerType("Output-Module",GOcontrollOutputModule);
	
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