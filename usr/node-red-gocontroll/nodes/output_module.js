module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const fs = require('fs');
	const fsp = require('fs/promises');

	const BOOTMESSAGELENGTH = 46;

	/* Assigned dynamically */
	var MESSAGELENGTH 	= 0;
	const SPISPEED = 2000000;

	
	function GOcontrollOutputModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		var modulesArr;
		var firmware;
		
		
		const moduleSlot = config.moduleSlot;
		const moduleType = config.moduleType; 
		const sampleTime = config.sampleTime;
	
		var outputType = {};
		outputType[0] = config.output1;
		outputType[1] = config.output2;
		outputType[2] = config.output3;
		outputType[3] = config.output4;
		outputType[4] = config.output5;
		outputType[5] = config.output6;
		outputType[6] = config.output7;
		outputType[7] = config.output8;
		outputType[8] = config.output9;
		outputType[9] = config.output10;
		
		var outputFreq = {};
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;
		outputFreq[2] = config.freq34;
		outputFreq[3] = config.freq34;
		outputFreq[4] = config.freq56;
		outputFreq[5] = config.freq56;
		outputFreq[6] = config.freq78;
		outputFreq[7] = config.freq78;
		outputFreq[8] = config.freq910;
		outputFreq[9] = config.freq910;
		
		var outputCurrent = {};
		outputCurrent[0] = config.current1;
		outputCurrent[1] = config.current2;
		outputCurrent[2] = config.current3;
		outputCurrent[3] = config.current4;
		outputCurrent[4] = config.current5;
		outputCurrent[5] = config.current6;
		
		var outputDuty = {};
		outputDuty[0] = config.duty1;
		outputDuty[1] = config.duty2;
		outputDuty[2] = config.duty3;
		outputDuty[3] = config.duty4;
		outputDuty[4] = config.duty5;
		outputDuty[5] = config.duty6;
		outputDuty[6] = config.duty7;
		outputDuty[7] = config.duty8;
		outputDuty[8] = config.duty9;
		outputDuty[9] = config.duty10;
		
		var outputTime = {};
		outputTime[0] = config.time1;
		outputTime[1] = config.time2;
		outputTime[2] = config.time3;
		outputTime[3] = config.time4;
		outputTime[4] = config.time5;
		outputTime[5] = config.time6;
		outputTime[6] = config.time7;
		outputTime[7] = config.time8;
		outputTime[8] = config.time9;
		outputTime[9] = config.time10;
		
		var key={};
		key[0] = config.key1;
		key[1] = config.key2;
		key[2] = config.key3;
		key[3] = config.key4;
		key[4] = config.key5;
		key[5] = config.key6;
		key[6] = config.key7;
		key[7] = config.key8;
		key[8] = config.key9;
		key[9] = config.key10;
		
		/* Declarations for timeout handlers */
		var resetTimeout;
		var initializeTimeout;
		var sendFirmwareDataTimeout;
		var getFirmwareStatusTimeout;
		var checkFirmwareTimeout;
		var firmwareUploadTimeout;
		var initializeSecondTimeout;
		
		var sL, sB;

		/* Assign information according module type */
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
			MESSAGELENGTH 	= 44;
		/* In case 10 channel output module is selected */
		}else{
			MESSAGELENGTH 	= 49;
		}
		
		/*Allocate memory for receive and send buffer */
		var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
		var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);

		const bootMessage = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength: BOOTMESSAGELENGTH+1,
		speedHz: SPISPEED 
		}];
		
		const normalMessage = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength: MESSAGELENGTH+1,
		speedHz: SPISPEED 
		}];

		const dummyMessage = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength : 5,
		speedHz: SPISPEED 
		}];
			
		
		var spiReady = 0;
		
		var msgOut={};
			
		/*Execute initialisation steps */
		/*Define the SPI port according the chosen module */
		switch(moduleSlot)
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

		/* Send dummy byte once so the master SPI is initialized properly */
		readFile();
			
		/* Start module reset and initialization proces */
		/* The output module reset is started after dummty byte is send */
		//OutputModule_StartReset();
		
		
		/* open SPI device for continous communication */
		const getData = spi.open(sL,sB, (err) => {
			if(!err)
			{
			spiReady = true;
			} 
		});

		async function readFile() {
			try {
				const data = await fsp.readFile('/usr/module-firmware/modules.txt', 'utf8');
				modulesArr = data.split(":");
				var moduleArr = modulesArr[moduleSlot-1].split("-");
				if (moduleArr[2].length==1) {
					moduleArr[2] = "0" + moduleArr[2];
				}
				if (moduleArr[3].length==1) {
					moduleArr[3] = "0" + moduleArr[3];
				}
				firmware = "HW:V"+moduleArr[0]+moduleArr[1]+moduleArr[2]+moduleArr[3] + "  SW:V"+moduleArr[4]+"."+moduleArr[5]+"."+moduleArr[6];
				/*check if the selected module is okay for this slot*/
				/*6 channel output*/
				if(moduleType == 1){
					if (firmware.includes("202002")) {
						node.status({fill:"green",shape:"dot",text:firmware})
						OutputModule_SendDummyByte(); 
					} else {
						node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."})
					}
				/* In case 10 channel output module is selected */
				}else{
					if (firmware.includes("202003")) {
						node.status({fill:"green",shape:"dot",text:firmware})
						OutputModule_SendDummyByte(); 
					} else {
						node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."})
					}
				}
			} catch (err) {
				node.warn(err + "You might need to run /usr/moduline/nodejs/module-info-gathering.js")
			}
		}
		
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_SendDummyByte(){
			
			/*Send dummy message to setup the SPI bus properly */
			const dummy = spi.open(sL,sB, (err) => {
				
				/* Only in this scope, receive buffer is available */
			dummy.transfer(dummyMessage, (err, dummyMessage) => {
			dummy.close(err =>{});
			/* Here we start the reset routine */
			//resetTimeout = setTimeout(OutputModule_StartReset, 50);
			OutputModule_StartReset();
			});
		
			});
		}

		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_StartReset (){
			/*Start module reset */
			OutputModule_Reset(1);
			/*Give a certain timeout so module is reset properly*/
			/*The stop of the reset is now called after the dummy is properly send */
			resetTimeout = setTimeout(OutputModule_StopReset, 200);
		}
				
				
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_StopReset (){
			OutputModule_Reset(0);
			/*After reset, give the module some time to boot */
			/*Next step is to check for new available firmware */
			checkFirmwareTimeout = setTimeout(OutputModule_CancelFirmwareUpload, 100);
			}	

		/***************************************************************************************
		** \brief 	First initialisation message that is send to the output module
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_Initialize(){

		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
		sendBuffer[2] = 101;
		sendBuffer[3] = 0;
		sendBuffer[4] = 0;
		sendBuffer[5] = 0;
			for(var s =0; s <6; s++)
			{
			sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
			sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
			}
		}
		/* In case 10 channel output module is selected */
		else{
		sendBuffer[2] = 1;
		sendBuffer[3] = 23;
		sendBuffer[4] = 2;
		sendBuffer[5] = 1;
		
			for(var s =0; s <10; s++)
			{
				var outputTypeSend = 0;
				/* Convert the function options to proper 10 channel options */
				if 		(outputType[s] === '1'){outputTypeSend  = 1;}
				else if (outputType[s] === '4'){outputTypeSend  = 2;}
				else if (outputType[s] === '6'){outputTypeSend  = 3;}
				else if (outputType[s] === '7'){outputTypeSend  = 4;}
				else if (outputType[s] === '8'){outputTypeSend  = 5;}
				
			sendBuffer[6+s] = (outputFreq[s]&15)|((outputTypeSend&15)<<4);
			sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
			}
		}
			
		sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const outputModule = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				outputModule.transfer(normalMessage, (err, normalMessage) => {
				initializeSecondTimeout = setTimeout(OutputModule_Initialize_Second, 100);	
				});
			});
		}
		
		
		/***************************************************************************************
		** \brief 	Second initialisation message that is send to the output module
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_Initialize_Second(){

		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		var values
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
		sendBuffer[2] = 111;
		sendBuffer[3] = 0;
		sendBuffer[4] = 0;
		sendBuffer[5] = 0;
		values = 6;
		/* In case 10 channel output module is selected */
		}else{
		sendBuffer[2] = 1;
		sendBuffer[3] = 23;
		sendBuffer[4] = 2;
		sendBuffer[5] = 2;
		values = 10;
		}
			
		for(var s =0; s <values; s++)
		{
		sendBuffer.writeUInt16LE(outputDuty[s], 6+(s*2));
		sendBuffer.writeUInt16LE(outputTime[s], 18+(s*2));
		}
						
		sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const outputModule = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				outputModule.transfer(normalMessage, (err, normalMessage) => {
				OutputModule_clearBuffer();
				});
			});	
		}
		
		/***************************************************************************************
		** \brief 	Cleanup sendbuffer for next messages otherwise it may be possible that the output
		**			values are directly set
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_clearBuffer(){	
		
		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
		sendBuffer[2] = 102;
		sendBuffer[3] = 0;
		sendBuffer[4] = 0;
		sendBuffer[5] = 0;
		/* In case 10 channel output module is selected */
		}else{
		sendBuffer[2] = 1;
		sendBuffer[3] = 23;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;
		}
		
			
			for(var s = 3; s <MESSAGELENGTH; s++)
			{
				sendBuffer[s] = 0;		   	
			}
				
		sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
		node.status({fill:"green",shape:"dot",text:firmware})
		/* Start interval to get module data */
		interval = setInterval(OutputModule_SendAndGetModuleData, parseInt(sampleTime));		
		}
		
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_SendAndGetModuleData (){
			
			if(!spiReady)
			{
				return;
			}		
				  getData.transfer(normalMessage, (err, normalMessage) => {
					  
					if(receiveBuffer[MESSAGELENGTH-1] === OutputModule_ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{

						/*In case dat is received that holds module information */
						if(receiveBuffer.readInt32LE(2) === 103)
						{
							msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6),
							msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
							msgOut["moduleStatus"] = receiveBuffer.readUInt32LE(22),
							msgOut[key[0]+"Current"]= receiveBuffer.readInt16LE(10),
							msgOut[key[1]+"Current"]= receiveBuffer.readInt16LE(12),
							msgOut[key[2]+"Current"]= receiveBuffer.readInt16LE(14),
							msgOut[key[3]+"Current"]= receiveBuffer.readInt16LE(16),
							msgOut[key[4]+"Current"]= receiveBuffer.readInt16LE(18),
							msgOut[key[5]+"Current"]= receiveBuffer.readInt16LE(20)	
							node.send(msgOut);								
						}
									
						else if(	receiveBuffer.readUInt8(2) === 2 	&& 
									receiveBuffer.readUInt8(3) === 23 	&&
									receiveBuffer.readUInt8(4) === 4 	&&
									receiveBuffer.readUInt8(5) === 1){
										
							msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6),
							msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
							msgOut["moduleVoltage"] = receiveBuffer.readInt16LE(10),
							msgOut["moduleCurrent"] = receiveBuffer.readUInt16LE(12)
							node.send(msgOut);	
						}	
					}
				});
		}



		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('input', function(msg) {
			
			sendBuffer[0] = 1;
			sendBuffer[1] = MESSAGELENGTH-1;

			/* In case 6 channel output module is selected */
			if(moduleType == 1){
			sendBuffer[2] = 102;
			sendBuffer[3] = 0;
			sendBuffer[4] = 0;
			sendBuffer[5] = 0;
			/* In case 10 channel output module is selected */
			}else{
			sendBuffer[2] = 1;
			sendBuffer[3] = 23;
			sendBuffer[4] = 3;
			sendBuffer[5] = 1;
			}
			
			if(moduleType == 1){
				for(var s =0; s <6; s++)
				{
				   if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
				   {
					sendBuffer.writeUInt16LE(msg[key[s]], (s*6)+6);
				   }				   	
				}
			}else{
				for(var s =0; s <10; s++)
				{
				   if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
				   {
					sendBuffer.writeUInt16LE(msg[key[s]], (s*2)+6);
				   }				   	
				}	
			}
			
			sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
		});
		

		
		
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('close', function(done) {
		clearInterval(interval);
		clearTimeout(resetTimeout);
		clearTimeout(initializeTimeout);
		clearTimeout(sendFirmwareDataTimeout);
		clearTimeout(getFirmwareStatusTimeout);
		clearTimeout(checkFirmwareTimeout);
		clearTimeout(firmwareUploadTimeout);
		clearTimeout(initializeSecondTimeout);
		done();
		});		
		

		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_ChecksumCalculator(array, length)
		{
		var pointer = 0;
		var checkSum = 0;
			for (pointer = 0; pointer<length; pointer++)
			{
			checkSum += array[pointer];
			}
		return (checkSum&255);	
		}

		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_CancelFirmwareUpload(){
			sendBuffer[0] = 19;
			sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
			sendBuffer[2] = 19;
			
			sendBuffer[BOOTMESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
	
			const cancel = spi.open(sL,sB, (err) => {

				cancel.transfer(bootMessage, (err, bootMessage) => {
				cancel.close(err =>{});});
				/* At this point, The module can be initialized */
				initializeTimeout = setTimeout(OutputModule_Initialize, 600);
			});
	
		}

		/***************************************************************************************
		** \brief	Function that controls the low level reset of the modules
		**
		** \param	State of the reset action
		** \return	None
		**
		****************************************************************************************/
		function OutputModule_Reset(state){
			if(state === 1)
			{
			fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','255');
			}
			else
			{
			fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','0');
			}
		}
	}
RED.nodes.registerType("Output-Module",GOcontrollOutputModule);
}