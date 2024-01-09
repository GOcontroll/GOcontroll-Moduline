module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const fs = require('fs');
	const fsp = require('fs/promises');

	const BOOTMESSAGELENGTH = 46;
	
	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;
	
	function GOcontrollBridgeModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		var modulesArr;
		var firmware;
		
		const moduleSlot = config.moduleSlot; 
		const sampleTime = config.sampleTime;
	
		var outputType = {};
		outputType[0] = config.output1;
		outputType[1] = config.output2;

		
		var outputFreq = {};
		outputFreq[0] = config.freq12;
		outputFreq[1] = config.freq12;

		
		var outputCurrent = {};
		outputCurrent[0] = 4000;//config.current1;
		outputCurrent[1] = 4000;//config.current2;

		
		var key={};
		key[0] = config.key1;
		key[1] = config.key2;
		
		/* Declarations for timeout handlers */
		var resetTimeout;
		var initializeTimeout;
		var sendFirmwareDataTimeout;
		var getFirmwareStatusTimeout;
		var checkFirmwareTimeout;
		var firmwareUploadTimeout;
		var clearBufferTimeout;
		
		var sL, sB;
		
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
				if (firmware.includes("202001")) {
					node.status({fill:"green",shape:"dot",text:firmware})
					BridgeModule_SendDummyByte(); 
				} else {
					node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."})
				}
			} catch (err) {
				node.warn("No module has been registered in slot " + moduleSlot + ", the module(s) configured for this slot will not work. If a module has been recently inserted in this slot, run go-scan-modules to register it.");
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
		function BridgeModule_SendDummyByte(){
			
			/*Send dummy message to setup the SPI bus properly */
			const dummy = spi.open(sL,sB, (err) => {
				
				/* Only in this scope, receive buffer is available */
			dummy.transfer(dummyMessage, (err, dummyMessage) => {
			dummy.close(err =>{});
			/* Here we start the reset routine */
			//resetTimeout = setTimeout(BridgeModule_StartReset, 50);
			BridgeModule_StartReset();
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
		function BridgeModule_StartReset (){
			/*Start module reset */
			BridgeModule_Reset(1);
			/*Give a certain timeout so module is reset properly*/
			/*The stop of the reset is now called after the dummy is properly send */
			resetTimeout = setTimeout(BridgeModule_StopReset, 200);
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
		function BridgeModule_StopReset (){
			BridgeModule_Reset(0);
			/*After reset, give the module some time to boot */
			/*Next step is to check for new available firmware */
			checkFirmwareTimeout = setTimeout(BridgeModule_CancelFirmwareUpload, 100);
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
		function BridgeModule_Initialize(){

		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		sendBuffer.writeUInt16LE(301,2);
		
		for(var s =0; s <2; s++)
		{
		sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
		sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
		}
						
		sendBuffer[MESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const bridgeModule = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				bridgeModule.transfer(normalMessage, (err, normalMessage) => {
				BridgeModule_clearBuffer();
				});
			});
	//		clearBufferTimeout = setTimeout(BridgeModule_clearBuffer, 100);	
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
		function BridgeModule_clearBuffer(){	
		
		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		sendBuffer.writeUInt16LE(302,2);
			
			for(var s = 4; s <MESSAGELENGTH; s++)
			{
				sendBuffer[s] = 0;		   	
			}
				
		sendBuffer[MESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
		node.status({fill:"green",shape:"dot",text:firmware})
		/* Start interval to get module data */
		interval = setInterval(BridgeModule_SendAndGetModuleData, parseInt(sampleTime));		
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
		function BridgeModule_SendAndGetModuleData (){
			
			if(!spiReady)
			{
				return;
			}		
				  getData.transfer(normalMessage, (err, normalMessage) => {
					  
					if(receiveBuffer[MESSAGELENGTH-1] === BridgeModule_ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
					{
						/*In case dat is received that holds module information */
						if(receiveBuffer.readUInt16LE(2) === 303)
						{	
							msgOut["moduleTemperature"] = receiveBuffer.readInt16LE(6),
							msgOut["moduleGroundShift"] = receiveBuffer.readUInt16LE(8),
							msgOut[key[0]+"Current"]= receiveBuffer.readInt16LE(10),
							msgOut[key[1]+"Current"]= receiveBuffer.readInt16LE(12),
								
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
			sendBuffer.writeUInt16LE(302,2);
		
			
			for(var s =0; s <2; s++)
			{
			   if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
			   {
				sendBuffer.writeUInt16LE(msg[key[s]], (s*6)+6);
			   }				   	
			}
			
			sendBuffer[MESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
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
		clearTimeout(clearBufferTimeout);
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
		function BridgeModule_ChecksumCalculator(array, length)
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
		function BridgeModule_CancelFirmwareUpload(){
			sendBuffer[0] = 19;
			sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
			sendBuffer[2] = 19;
			
			sendBuffer[BOOTMESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
	
			const cancel = spi.open(sL,sB, (err) => {

				cancel.transfer(bootMessage, (err, bootMessage) => {
				cancel.close(err =>{});});
				/* At this point, The module can be initialized */
				initializeTimeout = setTimeout(BridgeModule_Initialize, 600);
			});
	
		}


		/***************************************************************************************
		** \brief	Function that controls the low level reset of the modules
		**
		** \param	State of the reset action
		** \return	None
		**
		****************************************************************************************/
		function BridgeModule_Reset(state){
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
RED.nodes.registerType("Bridge-Module",GOcontrollBridgeModule);
}