module.exports = function(RED) {
    "use strict"

	const spi = require('spi-device');
	const ModuleReset = require('led');
	const fs = require('fs');
	
	const BOOTMESSAGELENGTH = 46
	const MESSAGELENGTH = 44;
	const SPISPEED = 2000000;

	
	function GOcontrollOutputModule(config) {	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
		var node = this;
		
		const moduleFirmwareLocation = "/usr/module-firmware/";
		
		const moduleSlot = config.moduleSlot; 
		const sampleTime = config.sampleTime;
		
		const moduleHwId1		= 20;
		const moduleHwId2		= 20;
		const moduleHwId3		= 2;
	
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
		
		/* Define the right module reset pin depending on the module location */
		const moduleReset = new ModuleReset("ResetM-" + String(moduleSlot));
		
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
		OutputModule_SendDummyByte();
			
		/* Start module reset and initialization proces */
		//OutputModule_StartReset();
		
		
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
		moduleReset.on();

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
		moduleReset.off();
		/*After reset, give the module some time to boot */
		/*Next step is to check for new available firmware */
		checkFirmwareTimeout = setTimeout(OutputModule_CheckFirmwareVersion, 100);
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
		function OutputModule_CheckFirmwareVersion(){
		/* Construct the firmware check message */ 
		sendBuffer[0] = 9;
		sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
		sendBuffer[2] = 9;


		/* calculate checksum */
		sendBuffer[BOOTMESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

			const firmware = spi.open(sL,sB, (err) => {
				/* Only in this scope, receive buffer is available */
				firmware.transfer(bootMessage, (err, bootMessage) => {

					if(receiveBuffer[BOOTMESSAGELENGTH-1] != OutputModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
					node.warn("Checksum from bootloader not correct");
					OutputModule_CancelFirmwareUpload();
					return;
					}
					else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
					node.warn("Wrong response from bootloader");
					OutputModule_CancelFirmwareUpload();
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
									node.warn("New firmware available for Output Module on slot: "+ moduleSlot +". Firmware version: "+ swVersionAvailable[0] + "." + swVersionAvailable[1] + "." + swVersionAvailable[2] +" will be installed");
									node.status({fill:"blue",shape:"dot",text:"Installing new firmware"});
									/* In this case, new firmware is available so tell the module there is new software */
									OutputModule_AnnounceFirmwareUpload();
									/* FOR DEBUG PURPOSE */
									//OutputModule_CancelFirmwareUpload();
									}
									else{
									/* In this case, the latest firmware is installed so show on node status*/
									const statusText = "HW:V"+hwVersion[0]+hwVersion[1]+"0"+hwVersion[2]+"0"+hwVersion[3]+"  SW:V"+swVersion[0]+"."+swVersion[1]+"."+swVersion[2];
									node.status({fill:"green",shape:"dot",text:statusText});
									/* Tell the module that it needs to start the module program */
									OutputModule_CancelFirmwareUpload();
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
		function OutputModule_Initialize(){

		sendBuffer[0] = 1;
		sendBuffer[1] = MESSAGELENGTH-1;
		sendBuffer[2] = 101;
			
		for(var s =0; s <6; s++)
		{
		sendBuffer[6+s] = (outputFreq[s]&15)|((outputType[s]&15)<<4);
		sendBuffer.writeUInt16LE(outputCurrent[s], 12+(s*2));
		}
						
		sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);
			
			const outputModule = spi.open(sL,sB, (err) => {

				/* Only in this scope, receive buffer is available */
				outputModule.transfer(normalMessage, (err, normalMessage) => {
				OutputModule_clearBuffer();
				});
			});
	//		clearBufferTimeout = setTimeout(OutputModule_clearBuffer, 100);	
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
		sendBuffer[2] = 102;
			
			for(var s = 3; s <MESSAGELENGTH; s++)
			{
				sendBuffer[s] = 0;		   	
			}
				
		sendBuffer[MESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);	
		
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
							msgOut[key[0]+"Current"]= receiveBuffer.readInt16LE(10),
							msgOut[key[1]+"Current"]= receiveBuffer.readInt16LE(12),
							msgOut[key[2]+"Current"]= receiveBuffer.readInt16LE(14),
							msgOut[key[3]+"Current"]= receiveBuffer.readInt16LE(16),
							msgOut[key[4]+"Current"]= receiveBuffer.readInt16LE(18),
							msgOut[key[5]+"Current"]= receiveBuffer.readInt16LE(20)
								
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
			sendBuffer[2] = 102;
			
			for(var s =0; s <6; s++)
			{
			   if(msg[key[s]] <= 1000 && msg[key[s]] >= 0)
			   {
				sendBuffer.writeUInt16LE(msg[key[s]], (s*6)+6);
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
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function OutputModule_AnnounceFirmwareUpload(){
		sendBuffer[0] = 29;
		sendBuffer[1] = BOOTMESSAGELENGTH-1; 
		sendBuffer[2] = 29;
		
		sendBuffer[6] = swVersionAvailable[0];
		sendBuffer[7] = swVersionAvailable[1];
		sendBuffer[8] = swVersionAvailable[2];
		
		sendBuffer[BOOTMESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

			const announce = spi.open(sL,sB, (err) => {

			/* Only in this scope, receive buffer is available */
			announce.transfer(bootMessage, (err, bootMessage) => {
			announce.close(err =>{});});
			
			/* The bootloader will start a memory erase which will take some seconds to complete. After that, start the firmware upload */
			firmwareUploadTimeout = setTimeout(OutputModule_FirmwareUpload, 2500);
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
		function OutputModule_FirmwareUpload(){
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
			initializeTimeout = setTimeout(OutputModule_Initialize, 600);
			return;
			}

				const firmware = spi.open(sL,sB, (err) => {
					OutputModule_SendFirmwareData();


					/***************************************************************************************
					** \brief
					**
					**
					** \param
					** \param
					** \return
					**
					****************************************************************************************/
					function OutputModule_SendFirmwareData(){
				
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
						sendBuffer[BOOTMESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

							firmware.transfer(bootMessage, (err, bootMessage) => {

							});

							if(messageType == 7){
							firmware.close(err =>{});
							node.warn("Firmware from output module on slot: "+moduleSlot+" updated! Now restarting module!");
							/* At this point, the module can be restarted to check if it provides the new installed firmware */
							OutputModule_StartReset();
							return;
							}
							
							else
							{
							getFirmwareStatusTimeout = setTimeout(OutputModule_GetFirmwareStatus, 3);
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
						function OutputModule_GetFirmwareStatus(){
				
						sendBuffer[0] = 49;
						sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
						sendBuffer[2] = 49;
						
						/* calculate checksum */
						sendBuffer[BOOTMESSAGELENGTH-1] = OutputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
						
							firmware.transfer(bootMessage, (err, bootMessage) => {

							if(receiveBuffer[BOOTMESSAGELENGTH-1] === OutputModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1))
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
									//node.warn("Firmware checksum for output module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );
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
											node.warn("Firmware checksum for output module on slot: "+moduleSlot+", error on line : "+lineNumber+" , 5 times! Stop firmware update!" );
											firmwareErrorCounter = 0;
											return;
											}
										}
									}
								}
							}
							else
							{
							//node.warn("Firmware checksum for output module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );	
							}
							
							sendFirmwareDataTimeout = setTimeout(OutputModule_SendFirmwareData, 1);

							});

						}
				});

			});	
		}
	}
RED.nodes.registerType("Output-Module",GOcontrollOutputModule);
}