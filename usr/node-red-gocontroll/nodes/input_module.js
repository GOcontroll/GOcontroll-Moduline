module.exports = function(RED) {
"use strict"

const spi = require('spi-device');
const fs = require('fs');
const fsp = require('fs/promises');

const BOOTMESSAGELENGTH = 46;
/* Assigned dynamically */
var MESSAGELENGTH 	= 0;
const SPISPEED = 2000000;



function GOcontrollInputModule(config) { 	 
	RED.nodes.createNode(this,config);

	var interval = null;
	var node = this;
	var modulesArr;
	var firmware;
	
	/* Get information from the Node configuration */
	const moduleSlot 		= parseInt(config.moduleSlot);
	const moduleType		= config.moduleType; 
	const sampleTime 		= config.sampleTime;
	
	var supply	={};
	supply[0] = config.supply1;
	supply[1] = config.supply2;
	supply[2] = config.supply3;
	
	var input	={};
	input[0] = config.input1;
	input[1] = config.input2;
	input[2] = config.input3;
	input[3] = config.input4;
	input[4] = config.input5;
	input[5] = config.input6;
	input[6] = config.input7;
	input[7] = config.input8;
	input[8] = config.input9;
	input[9] = config.input10;
	
	var voltageRange = {};
	voltageRange[0] = config.v1;
	voltageRange[1] = config.v2;
	voltageRange[2] = config.v3;
	voltageRange[3] = config.v4;
	voltageRange[4] = config.v5;
	voltageRange[5] = config.v6;
	
	var pullUp = {};
	/* In case 6 channel input module is selected */
	if(moduleType == 1){
	pullUp[0] = config.pua1;
	pullUp[1] = config.pua2;
	pullUp[2] = config.pua3;
	pullUp[3] = config.pua4;
	pullUp[4] = config.pua5;
	pullUp[5] = config.pua6;
	}
	/* In case 10 channel input module is selected */
	else{
	pullUp[0] = config.pub1;
	pullUp[1] = config.pub2;
	pullUp[2] = config.pub3;
	pullUp[3] = config.pub4;
	pullUp[4] = config.pub5;
	pullUp[5] = config.pub6;
	pullUp[6] = config.pub7;
	pullUp[7] = config.pub8;
	pullUp[8] = config.pub9;
	pullUp[9] = config.pub10;
	}
	
	var pullDown = {};
	/* In case 6 channel input module is selected */
	if(moduleType == 1){
	pullDown[0] = config.pda1;
	pullDown[1] = config.pda2;
	pullDown[2] = config.pda3;
	pullDown[3] = config.pda4;
	pullDown[4] = config.pda5;
	pullDown[5] = config.pda6;
	}
	/* In case 10 channel input module is selected */
	else{
	pullDown[0] = config.pdb1;
	pullDown[1] = config.pdb2;
	pullDown[2] = config.pdb3;
	pullDown[3] = config.pdb4;
	pullDown[4] = config.pdb5;
	pullDown[5] = config.pdb6;
	pullDown[6] = config.pdb7;
	pullDown[7] = config.pdb8;
	pullDown[8] = config.pdb9;
	pullDown[9] = config.pdb10;
	}

	var key	={};
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
	
	var sL, sB;
	
	/* Assign information according module type */
	/* In case 6 channel input module is selected */
	if(moduleType == 1){
		MESSAGELENGTH 	= 55;
	/* In case 10 channel input module is selected */
	}else{
		MESSAGELENGTH 	= 50;
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
	case 1: sL = 1; sB = 0;    break;
	case 2: sL = 1; sB = 1;    break;
	case 3: sL = 2; sB = 0;    break;
	case 4: sL = 2; sB = 1;    break;
	case 5: sL = 2; sB = 2;    break;
	case 6: sL = 2; sB = 3;    break;
	case 7: sL = 0; sB = 0;    break;
	case 8: sL = 0; sB = 1;    break;
	}

	/* Send dummy byte once so the master SPI is initialized properly */
	readFile();

	/* Start module reset and initialization proces */
	//InputModule_StartReset();

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
			/*6 channel input*/
			if(moduleType == 1){
				if (firmware.includes("201001")) {
					node.status({fill:"green",shape:"dot",text:firmware})
					InputModule_SendDummyByte(); 
				} else {
					node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."})
				}
			/* In case 10 channel input module is selected */
			}else{
				if (firmware.includes("201002")) {
					node.status({fill:"green",shape:"dot",text:firmware})
					InputModule_SendDummyByte(); 
				} else {
					node.status({fill:"red",shape:"dot",text:"Selected module does not match the firmware registered in this slot."})
				}
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
	function InputModule_SendDummyByte(){
		
		/*Send dummy message to setup the SPI bus properly */
		const dummy = spi.open(sL,sB, (err) => {
			
			/* Only in this scope, receive buffer is available */
		dummy.transfer(dummyMessage, (err, dummyMessage) => {
		dummy.close(err =>{});
		
		/* Here we start the reset routine */
		//resetTimeout = setTimeout(OutputModule_StartReset, 50);
		InputModule_StartReset();
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
	function InputModule_StartReset (){
	/*Start module reset */
	InputModule_Reset(1);
	/*Give a certain timeout so module is reset properly*/
	resetTimeout = setTimeout(InputModule_StopReset, 200);
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
	function InputModule_StopReset (){
	InputModule_Reset(0);	
	/*After reset, give the module some time to boot */
	/*Next step is to check for new available firmware */
	checkFirmwareTimeout = setTimeout(InputModule_CancelFirmwareUpload, 100);
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
	function InputModule_Initialize (){


		sendBuffer[0] = moduleSlot;
		sendBuffer[1] = MESSAGELENGTH-1;
		
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
			sendBuffer[2] = 1;
			sendBuffer[3] = 11;
			sendBuffer[4] = 2;
			sendBuffer[5] = 1;
		
			for(var messagePointer = 0; messagePointer < 6; messagePointer ++)
			{
			sendBuffer[(messagePointer+1)*6] = input[messagePointer];
			sendBuffer[((messagePointer+1)*6)+1] = (pullUp[messagePointer]&3)|((pullDown[messagePointer]&3)<<2)|((voltageRange[messagePointer]&3)<<6);
			}
			
			sendBuffer[42] = supply[0]; 
			sendBuffer[43] = supply[1]; 
			sendBuffer[44] = supply[2]; 
		}
		/* In case 10 channel output module is selected */
		else{
			sendBuffer[2] = 1;
			sendBuffer[3] = 12;
			sendBuffer[4] = 2;
			sendBuffer[5] = 1;
			for(var messagePointer = 0; messagePointer < 10; messagePointer ++)
			{
			sendBuffer[(messagePointer*4)+6] = input[messagePointer];
			sendBuffer[((messagePointer*4)+7)] = (pullUp[messagePointer]&3)|((pullDown[messagePointer]&3)<<2);
			}
			sendBuffer[46] = supply[0];
		}
		sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		const initialize = spi.open(sL,sB, (err) => {

			/* Only in this scope, receive buffer is available */
			initialize.transfer(normalMessage, (err, normalMessage) => {
				initialize.close(err =>{});
			});
		});
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

	sendBuffer[0] = moduleSlot;
	sendBuffer[1] = MESSAGELENGTH-1;
	
		/* In case 6 channel output module is selected */
		if(moduleType == 1){
		sendBuffer[2] = 1;
		sendBuffer[3] = 11;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;

		sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		getData.transfer(normalMessage, (err, normalMessage) => {
				if(receiveBuffer[MESSAGELENGTH-1] == InputModule_ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
				{
					/*In case dat is received that holds module information */
					if(	receiveBuffer.readUInt8(2) === 2 	&& 
						receiveBuffer.readUInt8(3) === 11 	&&
						receiveBuffer.readUInt8(4) === 3 	&&
						receiveBuffer.readUInt8(5) === 1){
							
						for(var messagePointer = 0; messagePointer < 6; messagePointer ++)
						{
						msgOut[key[messagePointer]] = receiveBuffer.readInt32LE((messagePointer*8)+6)
						}
					node.send(msgOut);
					}
				}					
			});	
		}
		else{
		sendBuffer[2] = 1;
		sendBuffer[3] = 12;
		sendBuffer[4] = 3;
		sendBuffer[5] = 1;

		sendBuffer[MESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, MESSAGELENGTH-1);

		getData.transfer(normalMessage, (err, normalMessage) => {
				if(receiveBuffer[MESSAGELENGTH-1] == InputModule_ChecksumCalculator(receiveBuffer, MESSAGELENGTH-1))
				{
					/*In case dat is received that holds module information */
					if(	receiveBuffer.readUInt8(2) === 2 	&& 
						receiveBuffer.readUInt8(3) === 12 	&&
						receiveBuffer.readUInt8(4) === 3 	&&
						receiveBuffer.readUInt8(5) === 1){
											
						for(var messagePointer = 0; messagePointer < 10; messagePointer ++)
						{
						msgOut[key[messagePointer]] = receiveBuffer.readInt32LE((messagePointer*4)+6)
						}
					node.send(msgOut);
					}
				}					
			});	
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
	** \brief	Function that controls the low level reset of the modules
	**
	** \param	State of the reset action
	** \return	None
	**
	****************************************************************************************/
	function InputModule_Reset(state){
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

RED.nodes.registerType("Input-Module",GOcontrollInputModule);
}
