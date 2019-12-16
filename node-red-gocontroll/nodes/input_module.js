module.exports = function(RED) {
    "use strict"
	
	var cron = require("cron");
	const spi = require('spi-device');
	var ModuleReset = require('led');
	
	var MESSAGELENGTH = 55;
	var SPISPEED = 2000000;
	
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
        
		const key1 = config.key1;
		const key2 = config.key2;
		const key3 = config.key3;
		const key4 = config.key4;
		const key5 = config.key5;
		const key6 = config.key6;
		
		
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

			  /* in this case, no data is received from module */
			  inputModule.transfer(message, (err, message) => {
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
							msg[key1] = receiveBuffer.readInt32LE(6),
							msg[key2] = receiveBuffer.readInt32LE(14),
							msg[key3] = receiveBuffer.readInt32LE(22),
							msg[key4] = receiveBuffer.readInt32LE(30),
							msg[key5] = receiveBuffer.readInt32LE(38),
							msg[key6] = receiveBuffer.readInt32LE(46),
						
						node.send(msg);
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