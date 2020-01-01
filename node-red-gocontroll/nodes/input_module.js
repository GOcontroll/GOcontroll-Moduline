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

const moduleSlot 		= config.moduleSlot;
const sampleTime 		= config.sampleTime;
const firmwareVersion 	= config.firmware;
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

var hwVersion = {};
var swVersion = {};
var swVersionAvailable = {};

var node = this;


var sL, sB;

var sendBuffer = Buffer.alloc(MESSAGELENGTH+5); 
var	receiveBuffer = Buffer.alloc(MESSAGELENGTH+5);

var spiReady = 0;

const moduleReset = new ModuleReset("ResetM-" + String(moduleSlot));

var firmwareFileName;


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

/*Create the module reset identifier and the convert the sampletime */
			


InputModule_SendDummyByte();


/*Start module reset */
moduleReset.on();

/*Give a certain timeout and generate callback*/
setTimeout(InputModule_Reset, 200);

/*Callback reset handler to get module out of reset */
function InputModule_Reset (){
moduleReset.off();
/*After reset, give the module some time to boot */
setTimeout(InputModule_CheckFirmwareVersion, 600);
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
	sendBuffer[1] = BOOTMESSAGELENGTH; // Messagelength from bootloader
	sendBuffer[2] = 9;


	/* calculate checksum */
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const firmware = spi.open(sL,sB, (err) => {
		var message = [{
		sendBuffer, 
		receiveBuffer,           
		byteLength: BOOTMESSAGELENGTH+1,
		speedHz: SPISPEED 
		}];

		/* Only in this scope, receive buffer is available */
		firmware.transfer(message, (err, message) => {

			if(receiveBuffer[BOOTMESSAGELENGTH-1] != InputModule_ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
			node.warn("Checksum from bootloader not correct");
			return;
			}
			else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
			node.warn("Wrong response from bootloader");
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
			fs.readdir("/root/GOcontroll/GOcontroll-Modules", (err, files) => {
				files.forEach(file => {
					
				var versionStored = file.split("-");
				
					if(hwVersion[0] == parseInt(versionStored[0],10) && hwVersion[1] == parseInt(versionStored[1],10) && hwVersion[2] == parseInt(versionStored[2],10) && hwVersion[3] == parseInt(versionStored[3],10)){
						/* Check if file that matches the hardware has a different software version */
						swVersionAvailable[0] = parseInt(versionStored[4],10)
						swVersionAvailable[1] = parseInt(versionStored[5],10)
						swVersionAvailable[2] = parseInt(versionStored[6],10)
						
						node.warn(swVersionAvailable[0]);
						node.warn(swVersionAvailable[1]);
						node.warn(swVersionAvailable[2]);
						
						if (swVersion[0] != swVersionAvailable[0] || swVersion[1] != swVersionAvailable[1] || swVersion[2] != swVersionAvailable[2]){
						firmwareFileName =  file;
						node.warn("New module firmware available" + firmwareFileName);
						InputModule_AnnounceFirmwareUpload();
						//InputModule_CancelFirmwareUpload();
						}
						else{
						InputModule_CancelFirmwareUpload();
						
						}	
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

	sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		const initialize = spi.open(sL,sB, (err) => {

		var message = [{
		sendBuffer, 
		receiveBuffer,             
		byteLength: MESSAGELENGTH+1,
		speedHz: SPISPEED 
		}];

			/* Only in this scope, receive buffer is available */
			initialize.transfer(message, (err, message) => {

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
				
				initialize.close(err =>{});
			});
		});

	/* Start interval to get module data */
	interval = setInterval(InputModule_GetData, parseInt(sampleTime));
	}

	/* open SPI device for communication */
	const inputModule = spi.open(sL,sB, (err) => {
		if(!err)
		{
		spiReady = true;
		} 
	});

	var msgOut={};

	var message = [{
	sendBuffer, 
	receiveBuffer,             
	byteLength: MESSAGELENGTH+1,
	speedHz: SPISPEED 
	}];

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

	/*CALLBACK*/
	inputModule.transfer(message, (err, message) => {
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
	sendBuffer[1] = BOOTMESSAGELENGTH; // Messagelength from bootloader
	sendBuffer[2] = 19;
	
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const cancel = spi.open(sL,sB, (err) => {
			
			const message = [{
			sendBuffer, 
			receiveBuffer,           
			byteLength : BOOTMESSAGELENGTH+1,
			speedHz: SPISPEED 
			}];

		cancel.transfer(message, (err, message) => {
		cancel.close(err =>{});});
		/* At this point, The module can be initialized */
		setTimeout(InputModule_Initialize, 600);
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
	sendBuffer[1] = BOOTMESSAGELENGTH; 
	sendBuffer[2] = 29;
	
	sendBuffer[6] = swVersionAvailable[0];
	sendBuffer[7] = swVersionAvailable[1];
	sendBuffer[8] = swVersionAvailable[2];
	
	sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

		const announce = spi.open(sL,sB, (err) => {
			
			const message = [{
			sendBuffer, 
			receiveBuffer,           
			byteLength : BOOTMESSAGELENGTH+1,
			speedHz: SPISPEED 
			}];

			/* Only in this scope, receive buffer is available */
		announce.transfer(message, (err, message) => {
		announce.close(err =>{});});
		
		/* The bootloader will start a memory erase which will take some seconds to complete. After that, start the firmware upload */
		setTimeout(InputModule_FirmwareUpload, 2500);
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
	var messageType;
	var lineLength;
	var memoryAddr ;
	var data;
	var checksum;
	var checksumCalculated = new Uint8Array(1);
	var sendbufferPointer;
	var messagePointer;

	sendBuffer[0] = 39;
	sendBuffer[1] = BOOTMESSAGELENGTH; // Messagelength from bootloader
	sendBuffer[2] = 39;

	node.warn(firmwareVersion);

		fs.readFile("/root/GOcontroll/GOcontroll-Modules/" + firmwareFileName, function(err, code){

		var str = code.toString();
		var line = str.split('\n');
		var lineNumber = -1;

			const firmware = spi.open(sL,sB, (err) => {

				var message = [{
				sendBuffer, 
				receiveBuffer,           
				byteLength : BOOTMESSAGELENGTH+1,
				speedHz: SPISPEED,
				}];

				sendData();

				function sendData(){
			
	
					lineNumber++
					messageType =  parseInt(line[lineNumber].slice(1, 2),16);
					/* Get the decimal length of the specific line */
					lineLength = parseInt((line[lineNumber].slice(2, 4)),16);
					memoryAddr = line[lineNumber].slice(4, 12);
					data = line[lineNumber].slice(12, (line[lineNumber].length - 3));
					checksum = parseInt(line[lineNumber].slice((line[lineNumber].length - 3), line[lineNumber].length),16);

				//	node.warn("command: " + messageType);
				//	node.warn("lineLength: " + lineLength);
				//	node.warn("memoryAddr: " + memoryAddr);

				//	node.warn("data: "+data);
				//	node.warn("checksum: "+ checksum);

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

						firmware.transfer(message, (err, message) => {

						});

						if(messageType == 7){
						firmware.close(err =>{});

						/* At this point, the module can receive its initialization data */
						setTimeout(InputModule_Initialize, 600);
						return;
						}
						else
						{
						setTimeout(sendData, 2);
						}
				
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
			
			var message = [{
			sendBuffer, 
			receiveBuffer,           
			byteLength : 5,
			speedHz: SPISPEED 
			}];

			/* Only in this scope, receive buffer is available */
		dummy.transfer(message, (err, message) => {
		dummy.close(err =>{});
		});
	
		});
	}

}


RED.nodes.registerType("Input-Module",GOcontrollInputModule);







}