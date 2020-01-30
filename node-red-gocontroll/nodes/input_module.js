module.exports = function(RED) {
"use strict"

const spi = require('spi-device');
const ModuleReset = require('led');
const fs = require('fs');

const BOOTMESSAGELENGTH = 46
const MESSAGELENGTH = 55;
const SPISPEED = 2000000;

function GOcontrollInputModule(config) { 	 
	RED.nodes.createNode(this,config);

	var interval = null;
	var node = this;
	
	const moduleFirmwareLocation = "/root/GOcontroll/GOcontroll-Moduline-III/module-firmware/";
	
	/* Get information from the Node configuration */
	const moduleSlot 		= config.moduleSlot;
	const sampleTime 		= config.sampleTime;
	
	const moduleHwId1		= 20;
	const moduleHwId2		= 10;
	const moduleHwId3		= 1;
	
	var input	={};
	input[0] = config.input1;
	input[1] = config.input2;
	input[2] = config.input3;
	input[3] = config.input4;
	input[4] = config.input5;
	input[5] = config.input6;
	
	var voltageRange = {};
	voltageRange[0] = config.v1;
	voltageRange[1] = config.v2;
	voltageRange[2] = config.v3;
	voltageRange[3] = config.v4;
	voltageRange[4] = config.v5;
	voltageRange[5] = config.v6;
	
	var pullUp = {};	
	pullUp[0] = config.pu1;
	pullUp[1] = config.pu2;
	pullUp[2] = config.pu3;
	pullUp[3] = config.pu4;
	pullUp[4] = config.pu5;
	pullUp[5] = config.pu6;
	
	var pullDown = {};
	pullDown[0] = config.pd1;
	pullDown[1] = config.pd2;
	pullDown[2] = config.pd3;
	pullDown[3] = config.pd4;
	pullDown[4] = config.pd5;
	pullDown[5] = config.pd6;

	var key	={};
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
	InputModule_SendDummyByte();

	/* Start module reset and initialization proces */
	InputModule_StartReset();


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
	function InputModule_StartReset (){
	/*Start module reset */
	moduleReset.on();

	/*Give a certain timeout so module is reset properly*/
	resetTimeout = setTimeout(InputModule_Reset, 300);
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
	function InputModule_Reset (){
	moduleReset.off();
	/*After reset, give the module some time to boot */
	/*Next step is to check for new available firmware */
	checkFirmwareTimeout = setTimeout(InputModule_CheckFirmwareVersion, 100);
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
	function InputModule_CheckFirmwareVersion(){
	/* Construct the firmware check message */ 
	sendBuffer[0] = 9;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 9;


	/* calculate checksum */
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const firmware = spi.open(sL,sB, (err) => {
			/* Only in this scope, receive buffer is available */
			firmware.transfer(bootMessage, (err, bootMessage) => {

				if(receiveBuffer[BOOTMESSAGELENGTH-1] != InputModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
				node.warn("Checksum from bootloader not correct");
				InputModule_CancelFirmwareUpload();
				return;
				}
				else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
				node.warn("Wrong response from bootloader");
				InputModule_CancelFirmwareUpload();
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
								node.warn("New firmware available for Input Module on slot: "+ moduleSlot +". Firmware version: "+ swVersionAvailable[0] + "." + swVersionAvailable[1] + "." + swVersionAvailable[2] +" will be installed");
								node.status({fill:"blue",shape:"dot",text:"Installing new firmware"});
								/* In this case, new firmware is available so tell the module there is new software */
								InputModule_AnnounceFirmwareUpload();
								/* FOR DEBUG PURPOSES */
								//InputModule_CancelFirmwareUpload();
								}
								else{
								/* In this case, the latest firmware is installed so show on node status*/
								const statusText = "HW:V"+hwVersion[0]+hwVersion[1]+"0"+hwVersion[2]+"0"+hwVersion[3]+"  SW:V"+swVersion[0]+"."+swVersion[1]+"."+swVersion[2];
								node.status({fill:"green",shape:"dot",text:statusText});
								/* Tell the module that it needs to start the module program */
								InputModule_CancelFirmwareUpload();
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
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function InputModule_Initialize (){

	sendBuffer[0] = 1;
	sendBuffer[1] = MESSAGELENGTH-1;
	sendBuffer[2] = 1;
	
	for(var messagePointer = 0; messagePointer < 6; messagePointer ++)
	{
	sendBuffer[(messagePointer+1)*6] = input[messagePointer];
	sendBuffer[((messagePointer+1)*6)+1] = (pullUp[messagePointer]&3)|((pullDown[messagePointer]&3)<<2)|((voltageRange[messagePointer]&3)<<6);
	}
	
	sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		const initialize = spi.open(sL,sB, (err) => {

			/* Only in this scope, receive buffer is available */
			initialize.transfer(normalMessage, (err, normalMessage) => {


				
				initialize.close(err =>{});
			});
		});

	/* Start interval to get module data */
	interval = setInterval(InputModule_GetData, parseInt(sampleTime));
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
	function InputModule_GetData (){	
		if(!spiReady){
		return;
		}

	sendBuffer[0] = 1;
	sendBuffer[1] = MESSAGELENGTH-1;
	sendBuffer[2] = 2;

	sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

	getData.transfer(normalMessage, (err, normalMessage) => {
			if(receiveBuffer[MESSAGELENGTH-1] == InputModule_ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
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
	function InputModule_ChecksumCalculator(array, length)
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
	function InputModule_CancelFirmwareUpload(){
	sendBuffer[0] = 19;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 19;
	
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const cancel = spi.open(sL,sB, (err) => {

		cancel.transfer(bootMessage, (err, bootMessage) => {
		cancel.close(err =>{});});
		/* At this point, The module can be initialized */
		initializeTimeout = setTimeout(InputModule_Initialize, 600);
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
	function InputModule_AnnounceFirmwareUpload(){
	sendBuffer[0] = 29;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; 
	sendBuffer[2] = 29;
	
	sendBuffer[6] = swVersionAvailable[0];
	sendBuffer[7] = swVersionAvailable[1];
	sendBuffer[8] = swVersionAvailable[2];
	
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const announce = spi.open(sL,sB, (err) => {

		/* Only in this scope, receive buffer is available */
		announce.transfer(bootMessage, (err, bootMessage) => {
		announce.close(err =>{});});
		
		/* The bootloader will start a memory erase which will take some seconds to complete. After that, start the firmware upload */
		firmwareUploadTimeout = setTimeout(InputModule_FirmwareUpload, 2500);
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
	function InputModule_FirmwareUpload(){
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
		initializeTimeout = setTimeout(InputModule_Initialize, 600);
		return;
		}

			const firmware = spi.open(sL,sB, (err) => {
				InputModule_SendFirmwareData();



				function InputModule_SendFirmwareData(){
			
					var messageType =  parseInt(line[lineNumber].slice(1, 2),16);
					/* Get the decimal length of the specific line */
					var lineLength = parseInt((line[lineNumber].slice(2, 4)),16);
					//memoryAddr = line[lineNumber].slice(4, 12);
					//data = line[lineNumber].slice(12, (line[lineNumber].length - 3));
					var checksum = parseInt(line[lineNumber].slice((line[lineNumber].length - 3), line[lineNumber].length),16);

					sendBuffer[0] = 39;
					sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
					sendBuffer[2] = 39;

					sendbufferPointer = 6;
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
					sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

						firmware.transfer(bootMessage, (err, bootMessage) => {

						});

						if(messageType == 7){
						firmware.close(err =>{});
						node.warn("Firmware from input module on slot: "+moduleSlot+" updated! Now restarting module!");
						/* At this point, the module can be restarted to check if it provides the new installed firmware */
						InputModule_StartReset();
						return;
						}
						else
						{
						getFirmwareStatusTimeout = setTimeout(InputModule_GetFirmwareStatus, 2);
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
				function InputModule_GetFirmwareStatus(){
				
				sendBuffer[0] = 49;
				sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
				sendBuffer[2] = 49;
						
				/* calculate checksum */
				sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
				
					firmware.transfer(bootMessage, (err, bootMessage) => {

					if(receiveBuffer[BOOTMESSAGELENGTH-1] === InputModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1))
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
							node.warn("Firmware checksum for input module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );
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
									node.warn("Firmware checksum for input module on slot: "+moduleSlot+", error on line : "+lineNumber+" , 5 times! Stop firmware update!" );
									firmwareErrorCounter = 0;
									return;
									}
								}
							}
						}
					}
					else
					{
					//node.warn("Firmware checksum for input module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );	
					}
							
					sendFirmwareDataTimeout = setTimeout(InputModule_SendFirmwareData, 2);

					});

				}
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
	function InputModule_SendDummyByte(){
		
		/*Send dummy message to setup the SPI bus properly */
		const dummy = spi.open(sL,sB, (err) => {
			
			/* Only in this scope, receive buffer is available */
		dummy.transfer(dummyMessage, (err, dummyMessage) => {
		dummy.close(err =>{});
		});
	
		});
	}
}

RED.nodes.registerType("Input-Module",GOcontrollInputModule);
}
