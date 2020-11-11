module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const fs = require('fs');
	
	const BOOTMESSAGELENGTH = 46
	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;

	
	function GOcontrollBridgeModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		
		const moduleFirmwareLocation = "/usr/module-firmware/";
		
		const moduleSlot = config.moduleSlot; 
		const sampleTime = config.sampleTime;
		
		const moduleHwId1		= 20;
		const moduleHwId2		= 20;
		const moduleHwId3		= 1;
	
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
	
		var hwVersion = {};
		var swVersion = {};
		var swVersionAvailable = {};
		
		var firmwareFileName;
		
		var firmwareLineCheck = 0;
		var firmwareErrorCounter = 0;
		
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
		BridgeModule_SendDummyByte();
			
		/* Start module reset and initialization proces */
		//BridgeModule_StartReset();
		
		
		/* open SPI device for continous communication */
		const getData = spi.open(sL,sB, (err) => {
			if(!err)
			{
			spiReady = true;
			} 
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
		checkFirmwareTimeout = setTimeout(BridgeModule_CheckFirmwareVersion, 100);
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
		function BridgeModule_CheckFirmwareVersion(){
		/* Construct the firmware check message */ 
		sendBuffer[0] = 9;
		sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
		sendBuffer[2] = 9;


		/* calculate checksum */
		sendBuffer[BOOTMESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

			const firmware = spi.open(sL,sB, (err) => {
				/* Only in this scope, receive buffer is available */
				firmware.transfer(bootMessage, (err, bootMessage) => {

					if(receiveBuffer[BOOTMESSAGELENGTH-1] != BridgeModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
					node.warn("Checksum from bootloader not correct");
					BridgeModule_CancelFirmwareUpload();
					return;
					}
					else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
					node.warn("Wrong response from bootloader");
					BridgeModule_CancelFirmwareUpload();
					return;
					}
					
					/* Still here so extract HW version and SW version */
					hwVersion[0] = receiveBuffer[6];
					hwVersion[1] = receiveBuffer[7];
					hwVersion[2] = receiveBuffer[8];
					hwVersion[3] = receiveBuffer[9];
					
					swVersion[0] = receiveBuffer[10];
					swVersion[1] = receiveBuffer[11];
					swVersion[2] = receiveBuffer[12];
									
					/* Check which files are present in the folder */
					fs.readdir(moduleFirmwareLocation, (err, files) => {
						files.forEach(file => {
		
							if(hwVersion[0] == moduleHwId1 && hwVersion[1] == moduleHwId2 && hwVersion[2] == moduleHwId3)
							{								
							/* In this case, the node matches the installed hardware */
							var versionStored = file.split("-");
								if(hwVersion[0] == parseInt(versionStored[0],10) && hwVersion[1] == parseInt(versionStored[1],10) && hwVersion[2] == parseInt(versionStored[2],10) && hwVersion[3] == parseInt(versionStored[3],10)){
									/* Check if file that matches the hardware has a different software version */
									swVersionAvailable[0] = parseInt(versionStored[4],10)
									swVersionAvailable[1] = parseInt(versionStored[5],10)
									swVersionAvailable[2] = parseInt(versionStored[6],10)

									if (swVersion[0] != swVersionAvailable[0] || swVersion[1] != swVersionAvailable[1] || swVersion[2] != swVersionAvailable[2]){
									firmwareFileName =  file;
									node.warn("New firmware available for Bridge Module on slot: "+ moduleSlot +". Firmware version: "+ swVersionAvailable[0] + "." + swVersionAvailable[1] + "." + swVersionAvailable[2] +" will be installed");
									node.status({fill:"blue",shape:"dot",text:"Installing new firmware"});
									/* In this case, new firmware is available so tell the module there is new software */
									BridgeModule_AnnounceFirmwareUpload();
									/* FOR DEBUG PURPOSE */
									//BridgeModule_CancelFirmwareUpload();
									}
									else{
									/* In this case, the latest firmware is installed so show on node status*/
									const statusText = "HW:V"+hwVersion[0]+hwVersion[1]+"0"+hwVersion[2]+"0"+hwVersion[3]+"  SW:V"+swVersion[0]+"."+swVersion[1]+"."+swVersion[2];
									node.status({fill:"green",shape:"dot",text:statusText});
									/* Tell the module that it needs to start the module program */
									BridgeModule_CancelFirmwareUpload();
									}
								return;								
								}
							}
							else
							{
							node.status({fill:"red",shape:"dot",text:"Installed module does not match with node"});	
							}
						});
					});
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
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function BridgeModule_AnnounceFirmwareUpload(){
		sendBuffer[0] = 29;
		sendBuffer[1] = BOOTMESSAGELENGTH-1; 
		sendBuffer[2] = 29;
		
		sendBuffer[6] = swVersionAvailable[0];
		sendBuffer[7] = swVersionAvailable[1];
		sendBuffer[8] = swVersionAvailable[2];
		
		sendBuffer[BOOTMESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

			const announce = spi.open(sL,sB, (err) => {

			/* Only in this scope, receive buffer is available */
			announce.transfer(bootMessage, (err, bootMessage) => {
			announce.close(err =>{});});
			
			/* The bootloader will start a memory erase which will take some seconds to complete. After that, start the firmware upload */
			firmwareUploadTimeout = setTimeout(BridgeModule_FirmwareUpload, 2500);
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
		function BridgeModule_FirmwareUpload(){
		var checksumCalculated = new Uint8Array(1);
		var sendbufferPointer;
		var messagePointer;

			fs.readFile(moduleFirmwareLocation + firmwareFileName, function(err, code){

			if (err) {
				node.warn("Error opening firmware file");
				node.status({fill:"red",shape:"dot",text:"Error opening firmware file"});
				throw err;
			}

			var str = code.toString();
			var line = str.split('\n');
			var lineNumber = 0;
			
			if(!(line.length > 1))
			{
			node.warn("Firmware file corrupt");
			node.status({fill:"red",shape:"dot",text:"Firmware file corrupt"});
			initializeTimeout = setTimeout(BridgeModule_Initialize, 600);
			return;
			}

				const firmware = spi.open(sL,sB, (err) => {
					BridgeModule_SendFirmwareData();


					/***************************************************************************************
					** \brief
					**
					**
					** \param
					** \param
					** \return
					**
					****************************************************************************************/
					function BridgeModule_SendFirmwareData(){
				
						var messageType =  parseInt(line[lineNumber].slice(1, 2),16);
						/* Get the decimal length of the specific line */
						var lineLength = parseInt((line[lineNumber].slice(2, 4)),16);
						//memoryAddr = line[lineNumber].slice(4, 12);
						//data = line[lineNumber].slice(12, (line[lineNumber].length - 3));
						var checksum = parseInt(line[lineNumber].slice((line[lineNumber].length - 3), line[lineNumber].length),16);

						sendBuffer[0] = 39;
						sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
						sendBuffer[2] = 39;


						var sendbufferPointer = 6;
						sendBuffer[sendbufferPointer++] = lineNumber>>8; 
						sendBuffer[sendbufferPointer++] = lineNumber;
						sendBuffer[sendbufferPointer++] = messageType; 

						checksumCalculated[0] = 0;

							for(messagePointer = 2; messagePointer < (lineLength*2)+2; messagePointer += 2)
							{
							sendBuffer[sendbufferPointer] = parseInt((line[lineNumber].slice(messagePointer,messagePointer+2)),16);
							checksumCalculated[0] += sendBuffer[sendbufferPointer++];	
							}

						sendBuffer[sendbufferPointer++] = parseInt((line[lineNumber].slice(messagePointer,messagePointer+2)),16);

						checksumCalculated[0] = ~checksumCalculated[0];

							if(checksumCalculated[0] != checksum)
							{
							node.warn("Wrong file checksum: "+ checksumCalculated[0]);
							}

						/* calculate checksum */
						sendBuffer[BOOTMESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

							firmware.transfer(bootMessage, (err, bootMessage) => {

							});

							if(messageType == 7){
							firmware.close(err =>{});
							node.warn("Firmware from bridge module on slot: "+moduleSlot+" updated! Now restarting module!");
							/* At this point, the module can be restarted to check if it provides the new installed firmware */
							BridgeModule_StartReset();
							return;
							}
							
							else
							{
							getFirmwareStatusTimeout = setTimeout(BridgeModule_GetFirmwareStatus, 3);
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
						function BridgeModule_GetFirmwareStatus(){
				
						sendBuffer[0] = 49;
						sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
						sendBuffer[2] = 49;
						
						/* calculate checksum */
						sendBuffer[BOOTMESSAGELENGTH-1] = BridgeModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
						
							firmware.transfer(bootMessage, (err, bootMessage) => {

							if(receiveBuffer[BOOTMESSAGELENGTH-1] === BridgeModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1))
							{
								/* Check if received data complies with the actual line number from the .srec file */
								if(lineNumber == receiveBuffer.readUInt16BE(6))
								{
									/* Check if the returned line is correctly received by module*/
									if(receiveBuffer[8] ==1)
									{
										/* At this position, the module has received the line correct so jump to next line */
										lineNumber++;
									}
									else
									{
									//node.warn("Firmware checksum for bridge module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );
										if(firmwareLineCheck != lineNumber)
										{
										firmwareLineCheck = lineNumber;
										firmwareErrorCounter = 0;
										}
										else
										{
											firmwareErrorCounter ++;
										
											if(firmwareErrorCounter > 5)
											{
											node.warn("Firmware checksum for bridge module on slot: "+moduleSlot+", error on line : "+lineNumber+" , 5 times! Stop firmware update!" );
											firmwareErrorCounter = 0;
											return;
											}
										}
									}
								}
							}
							else
							{
							//node.warn("Firmware checksum for bridge module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );	
							}
							
							sendFirmwareDataTimeout = setTimeout(BridgeModule_SendFirmwareData, 1);

							});

						}
				});

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