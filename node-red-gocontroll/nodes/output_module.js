module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const ModuleReset = require('led');
	
	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;

	
	function GOcontrollOutputModule(config) { 	 
	   RED.nodes.createNode(this,config);
	   
		this.moduleSlot = config.moduleSlot; 
		this.sampleTime = config.sampleTime;
		var node = this;
	
		var outputType = {};
		outputType[0] = config.output1;
		outputType[1] = config.output2;
		outputType[2] = config.output3;
		outputType[3] = config.output4;
		outputType[4] = config.output5;
		outputType[5] = config.output6;
		
		var outputFreq = {};
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;
		outputFreq[2] = config.freq34;
		outputFreq[3] = config.freq34;
		outputFreq[4] = config.freq56;
		outputFreq[5] = config.freq56;
		
		var outputCurrent = {};
		outputCurrent[0] = config.current1;
		outputCurrent[1] = config.current2;
		outputCurrent[2] = config.current3;
		outputCurrent[3] = config.current4;
		outputCurrent[4] = config.current5;
		outputCurrent[5] = config.current6;
		
		var key={};
		key[0] = config.key1;
		key[1] = config.key2;
		key[2] = config.key3;
		key[3] = config.key4;
		key[4] = config.key5;
		key[5] = config.key6;
		
		//var statusText = "test";
		
		var sL, sB;
		
		/*Allocate memory for receive and send buffer */
		var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
		var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);
		
		var spiReady = 0;
		/*Execute initialisation steps */
		/*Define the SPI port according the chosen module */
		switch(this.moduleSlot)
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
		const moduleReset = new ModuleReset("ResetM-" + String(this.moduleSlot));			
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
			
		for(var s =0; s <6; s++)
		{
		sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
		sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
		}
						
		sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const outputModule = spi.open(sL,sB, (err) => {
			  const message = [{
				sendBuffer, 
				receiveBuffer,           
				byteLength: MESSAGELENGTH+1,
				speedHz: SPISPEED 
			  }];

				/* Only in this scope, receive buffer is available */
				outputModule.transfer(message, (err, message) => {
					
					if((receiveBuffer[6] != 20 || receiveBuffer[7] != 20 || receiveBuffer[8] != 2)&&(receiveBuffer[6] != 0 && receiveBuffer[7] != 0 && receiveBuffer[8] != 0)){
					node.status({fill:"red",shape:"dot",text:"Module does not match node"});
					}
					else if(receiveBuffer[6] == 0 && receiveBuffer[7] == 0 && receiveBuffer[8] == 0){
					node.status({fill:"red",shape:"dot",text:"No module installed"});
					}
					else{	
					const statusText = "HW:V"+receiveBuffer[6]+receiveBuffer[7]+receiveBuffer[8]+receiveBuffer[9]+"  SW:V"+receiveBuffer[10]+"."+receiveBuffer[11]+"."+receiveBuffer[12];
					node.status({fill:"green",shape:"dot",text:statusText});
					}
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



			var value = {};
			/***execution initiated by event *******/
			node.on('input', function(msg) {
				
			if(!spiReady)
			{
				return;
			}

			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;
			sendBuffer[2] = 102;
						
			for(var s =0; s <6; s++)
			{
			   if(msg.payload[key[s]] <= 1000 && msg.payload[key[s]] >= 0)
			   {
				sendBuffer.writeUInt16LE(msg.payload[key[s]], (s*6)+6);
			   }				   	
			}
			
			sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			
				  outputModule.transfer(message, (err, message) => {
					  
					if(receiveBuffer[MESSAGELENGTH-1] === ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{
						/*In case dat is received that holds module information */
						if(receiveBuffer.readInt32LE(2) === 103)
						{
							
							msg["moduleTemperature"] = receiveBuffer.readInt16LE(6),
							msg["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
							msg[key[0]+"Current"]= receiveBuffer.readInt16LE(10),
							msg[key[1]+"Current"]= receiveBuffer.readInt16LE(12),
							msg[key[2]+"Current"]= receiveBuffer.readInt16LE(14),
							msg[key[3]+"Current"]= receiveBuffer.readInt16LE(16),
							msg[key[4]+"Current"]= receiveBuffer.readInt16LE(18),
							msg[key[5]+"Current"]= receiveBuffer.readInt16LE(20)
								
						node.send(msg);	
						}
					}
				});
		});
	}

	RED.nodes.registerType("Output-Module",GOcontrollOutputModule);
	
	
	/* Function to calculate the checksum for a message */
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