module.exports = function(RED) {
    "use strict"
	
	const cron = require("cron");
	const spi = require('spi-device');
	const ModuleReset = require('led');
	
	const MESSAGELENGTH = 55;
	const SPISPEED = 2000000;
	
	function GOcontrollInputModule(config) { 	 
	   RED.nodes.createNode(this,config);
	   
		this.moduleLocation = config.moduleLocation;
		this.sampleTime = config.sampleTime;
		this.input1 = config.input1;
		this.v1 = config.v1;
		this.pu1 = config.pu1;
		this.pd1 = config.pd1;
		this.input2 = config.input2;
		this.v2 = config.v2;
		this.pu2 = config.pu2;
		this.pd2 = config.pd2;
		this.input3 = config.input3;
		this.v3 = config.v3;
		this.pu3 = config.pu3;
		this.pd3 = config.pd3;
		this.input4 = config.input4;
		this.v4 = config.v4;
		this.pu4 = config.pu4;
		this.pd4 = config.pd4;
		this.input5 = config.input5;
		this.v5 = config.v5;
		this.pu5 = config.pu5;
		this.pd5 = config.pd5;
		this.input6 = config.input6;
		this.v6 = config.v6;
		this.pu6 = config.pu6;
		this.pd6 = config.pd6;
        
		var key	={};
		key[0] = config.key1;
		key[1] = config.key2;
		key[2] = config.key3;
		key[3] = config.key4;
		key[4] = config.key5;
		key[5] = config.key6;
		
		
		var node = this;
		
		
		var sL, sB;
		
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

		/*Send dummy message to setup the SPI bus properly */
		const dummy = spi.open(sL,sB, (err) => {
		  const message = [{
			sendBuffer, 
			receiveBuffer,           
			byteLength: 5,
			speedHz: SPISPEED 
		  }];

			/* Only in this scope, receive buffer is available */
			dummy.transfer(message, (err, message) => {
			});
		});
		
		/*Start module reset */
		moduleReset.on();
		
		/*Give a certain timeout and generate callback*/
		setTimeout(resetModule, 200);
		
		/*Callback reset handler to get module out of reset */
		function resetModule (){
			moduleReset.off();
			/*After reset, give the module some time to boot */
			setTimeout(initializeModule, 600);
		}
		
		/*At this point, device is booted so send the initialization data */
		function initializeModule (){
		
		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		sendBuffer[2] = 1;
		sendBuffer[6] = node.input1;
		sendBuffer[7] = (node.pu1&3)|((node.pd1&3)<<2)|((node.v1&3)<<6);
		sendBuffer[12] = node.input2;
		sendBuffer[13] = (node.pu2&3)|((node.pd2&3)<<2)|((node.v2&3)<<6);
		sendBuffer[18] = node.input3;
		sendBuffer[19] = (node.pu3&3)|((node.pd3&3)<<2)|((node.v3&3)<<6);
		sendBuffer[24] = node.input4;
		sendBuffer[25] = (node.pu4&3)|((node.pd4&3)<<2)|((node.v4&3)<<6);
		sendBuffer[30] = node.input5;
		sendBuffer[31] = (node.pu5&3)|((node.pd5&3)<<2)|((node.v5&3)<<6);
		sendBuffer[36] = node.input6;
		sendBuffer[37] = (node.pu6&3)|((node.pd6&3)<<2)|((node.v6&3)<<6);
				
		sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
		
			const inputModule = spi.open(sL,sB, (err) => {

			  const message = [{
				sendBuffer, 
				receiveBuffer,             
				byteLength: MESSAGELENGTH+1,
				speedHz: SPISPEED 
			  }];

			  /* Only in this scope, receive buffer is available */
			  inputModule.transfer(message, (err, message) => {
				  
					if((receiveBuffer[6] != 20 || receiveBuffer[7] != 10 || receiveBuffer[8] != 1)&&(receiveBuffer[6] != 0 && receiveBuffer[7] != 0 && receiveBuffer[8] != 0)){
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

		
		/***start timed event *******/
		  node.repeaterSetup = function () {
          if (!isNaN(sampleTime) && sampleTime >= 10) {		
			if (RED.settings.verbose) {
			node.log("verbose setting");			
            }
            this.interval_id = setInterval(function() {
            node.emit("input", {});
            },sampleTime);
          } else if (this.crontab) {
            if (RED.settings.verbose) {
			node.log("verbose settings");	
            }
            this.cronjob = new cron.CronJob(this.crontab, function() { node.emit("input", {}); }, null, true);
          }
        };
		
		/***start timed event *******/
		node.repeaterSetup();

		/* open SPI device for communication */
		var inputModule = spi.open(sL,sB, (err) => {
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

		var msgOut={};

		/***execution initiated by event *******/
		node.on('input', function(msg) {

		if(!spiReady)
		{
			return;
		}

		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		sendBuffer[2] = 2;
		
		sendBuffer[MESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
		
				/*CALLBACK*/
				inputModule.transfer(message, (err, message) => {
					if(receiveBuffer[MESSAGELENGTH-1] == ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{
						/*In case dat is received that holds module information */
						if(receiveBuffer.readInt32LE(2) == 2)
						{
							msgOut[key[0]] = receiveBuffer.readInt32LE(6),
							msgOut[key[1]] = receiveBuffer.readInt32LE(14),
							msgOut[key[2]] = receiveBuffer.readInt32LE(22),
							msgOut[key[3]] = receiveBuffer.readInt32LE(30),
							msgOut[key[4]] = receiveBuffer.readInt32LE(38),
							msgOut[key[5]] = receiveBuffer.readInt32LE(46),
						
						node.send(msgOut);
						}
					}					
				});

    });
	}

	RED.nodes.registerType("Input-Module",GOcontrollInputModule);

	    GOcontrollInputModule.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
        } else if (this.cronjob != null) {
            this.cronjob.stop();
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
            delete this.cronjob;
        }
    };
	
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