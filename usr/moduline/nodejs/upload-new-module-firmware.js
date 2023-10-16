const spi = require('spi-device');
const fs = require('fs');
var shell = require('shelljs');
const { exit } = require('process');

var args = process.argv.slice(2)
const slot = parseInt(args[0]);
const newFirmware = args[1];
var forceUpdate = parseInt(args[2])

if (!args[0] && !args[1]) {
	console.log("Provide arguments to use this script: command <module slot> <firmware.srec> <force update: 1 for yes, empty or else for no>");
	exit(-1);
}

fs.stat("/usr/module-firmware/" + newFirmware, (error, stats) => {
	if (error) {
		console.log("Firmware file does not exist, enter a valid firmware file");
		exit(-1);
	}
	else if (!newFirmware.includes(".srec")) {
		console.log("File must have a .srec extension to be valid");
		exit(-1);
	}
});


if (forceUpdate == 1) {
	console.log("Forcing update, I hope you know what you are doing.");
}


const moduleFirmwareLocation = "/usr/module-firmware/"
const BOOTMESSAGELENGTH = 46
const SPISPEED = 2000000;

let nodered =  true; 
let simulink = true;

var controllerType, hardwareFile;
try {
	hardwareFile = fs.readFileSync("/sys/firmware/devicetree/base/hardware", "utf-8");
} catch(err) {
	console.error(err);
	exit(-1);
}
if (hardwareFile.includes("Moduline IV")) {
	controllerType = "IV"
	if (slot<1|slot>8) {
		console.log("Incorrect slot number entered, must be a number ranging from 1 to 8");
		exit(-1);
	}
} else if (hardwareFile.includes("Moduline Mini")) {
	controllerType = "mini"
	if (slot<1|slot>4) {
		console.log("Incorrect slot number entered, must be a number ranging from 1 to 4");
		exit(-1);
	}
} else if (hardwareFile.includes("Moduline Screen")) {
	controllerType = "screen"
	if (slot<1|slot>2) {
		console.log("Incorrect slot number entered, must be a number ranging from 1 to 2");
		exit(-1);
	}
}

var newHwVersion = new Array(4)
var newSwVersion = new Array(3)
var oldSwVersion = new Array(3)

const newFirmwareArray = newFirmware.split(".")[0].split("-");

newHwVersion[0] = newFirmwareArray[0]
newHwVersion[1] = newFirmwareArray[1]
newHwVersion[2] = newFirmwareArray[2]
newHwVersion[3] = newFirmwareArray[3]

newSwVersion[0] = newFirmwareArray[4]
newSwVersion[1] = newFirmwareArray[5]
newSwVersion[2] = newFirmwareArray[6]

var sendBuffer = Buffer.alloc(BOOTMESSAGELENGTH+5); 
var	receiveBuffer = Buffer.alloc(BOOTMESSAGELENGTH+5);

var firmwareLineCheck = 0;
var firmwareErrorCounter = 0;

/* Declarations for timeout handlers */
var resetTimeout;
var sendFirmwareDataTimeout;
var getFirmwareStatusTimeout;
var checkFirmwareTimeout;
var firmwareUploadTimeout;

var sL, sB;

const bootMessage = [{
	sendBuffer,
	receiveBuffer,
	byteLength: BOOTMESSAGELENGTH+1,
	speedHz: SPISPEED 
}];

const dummyMessage = [{
	sendBuffer,
	receiveBuffer,
	byteLength : 5,
	speedHz: SPISPEED 
}];

switch(controllerType)
{
	case "IV":
		switch(slot)
		{
			case 1: sL = 1; sB = 0;	break;
			case 2: sL = 1; sB = 1;	break;
			case 3: sL = 2; sB = 0;	break;
			case 4: sL = 2; sB = 1;	break;
			case 5: sL = 2; sB = 2;	break;
			case 6: sL = 2; sB = 3;	break;
			case 7: sL = 0; sB = 0;	break;
			case 8: sL = 0; sB = 1;	break;
			default: exit(-1);
		}

		break;
	case "mini":
		switch(slot)
		{
			case 1: sL = 1; sB=0;	break;
			case 2: sL = 1; sB=1;	break;
			case 3: sL = 2; sB=0;	break;
			case 4: sL = 2; sB=1;	break;
			default: exit(-1);
		}
		break;
	case "screen":
		switch(slot)
		{
			case 1: sL = 1; sB=0;	break;
			case 2: sL = 1; sB=1;	break;
			default: exit(-1);
		}
		break;
	default:
		exit(-1);
}

var exec = require('child_process').exec, child;
child = exec('systemctl is-active nodered', function(error, stdout, stderr){
	if (stdout !== null) {
		if (stdout.includes("in")) {
			nodered = false;
		}
	}
	child2 = exec('systemctl is-active go-simulink', function(error, stdout, stderr){
		if (stdout !== null) {
			if (stdout.includes("in")) {
				simulink = false;
			}
		}
		shell.exec('systemctl stop nodered');
		shell.exec('systemctl stop go-simulink');

		SendDummyByte();
	})
})

function RestartServices() {
	if(nodered) {
		shell.exec('systemctl start nodered');
	}
	if(simulink) {
		shell.exec('systemctl start go-simulink');
	}
}

function SendDummyByte(){
	/*Send dummy message to setup the SPI bus properly */
	const dummy = spi.open(sL,sB, (err) => {

		/* Only in this scope, receive buffer is available */
		dummy.transfer(dummyMessage, (err, dummyMessage) => {
			dummy.close(err =>{});

			/* Here we start the reset routine */
			Module_StartReset();
		});

	});
}

function Module_StartReset (){
	/*Start module reset */
	Module_Reset(1);
	/*Give a certain timeout so module is reset properly*/
	resetTimeout = setTimeout(Module_StopReset, 200);
}

function Module_StopReset (){
	Module_Reset(0);	
	/*After reset, give the module some time to boot */
	/*Next step is to check for new available firmware */
	checkFirmwareTimeout = setTimeout(Module_CheckFirmwareVersion, 100);
	}

function Module_CheckFirmwareVersion(){
	var hwVersion = new Array(4)
	var swVersion = new Array(3)
	/* Construct the firmware check message */ 
	sendBuffer[0] = 9;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 9;

	/* calculate checksum */
	sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

	const firmware = spi.open(sL,sB, (err) => {
		/* Only in this scope, receive buffer is available */
		firmware.transfer(bootMessage, (err, bootMessage) => {

			if(receiveBuffer[BOOTMESSAGELENGTH-1] != ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
				console.log("error: Checksum from bootloader not correct");
				Module_CancelFirmwareUpload();
				RestartServices();
				return;
			}
			else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
				console.log("error: Wrong response from bootloader");
				Module_CancelFirmwareUpload();
				RestartServices();
				return;
			}

			/* Still here so extract current firmware*/
			hwVersion[0] = String(receiveBuffer[6]);
			hwVersion[1] = String(receiveBuffer[7]);
			hwVersion[2] = String(receiveBuffer[8]);
			hwVersion[3] = String(receiveBuffer[9]);
			
			swVersion[0] = String(receiveBuffer[10]);
			swVersion[1] = String(receiveBuffer[11]);
			swVersion[2] = String(receiveBuffer[12]);

			if (ArrayEquals(hwVersion, newHwVersion) && !ArrayEquals(swVersion, newSwVersion)) {
				oldSwVersion = swVersion;
				Module_AnnounceFirmwareUpload();
			} else if (forceUpdate==1) {
				oldSwVersion = swVersion;
				oldSwVersion[0] = "l"
				forceUpdate=0;
				Module_AnnounceFirmwareUpload();
			} else if (!ArrayEquals(oldSwVersion, swVersion)) {
				console.log("firmware update successfull")
				Module_CancelFirmwareUpload();
				RestartServices();
			} else {
				console.log("error: invalid update detected")
				Module_CancelFirmwareUpload();
				RestartServices();
			}
		});
	});
}

function ChecksumCalculator(array, length) {
	var pointer = 0;
	var checkSum = 0;
		for (pointer = 0; pointer<length; pointer++)
		{
			checkSum += array[pointer];
		}
	return (checkSum&255);	
}

/***************************************************************************************/

function Module_CancelFirmwareUpload(){
	sendBuffer[0] = 19;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 19;

	sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

	const cancel = spi.open(sL,sB, (err) => {

		cancel.transfer(bootMessage, (err, bootMessage) => {
			cancel.close(err =>{});
		});
		/* At this point, The module can be initialized */
	});

}

/***************************************************************************************/

function Module_AnnounceFirmwareUpload(){
	sendBuffer[0] = 29;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; 
	sendBuffer[2] = 29;

	sendBuffer[6] = parseInt(newSwVersion[0]);
	sendBuffer[7] = parseInt(newSwVersion[1]);
	sendBuffer[8] = parseInt(newSwVersion[2]);

	sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

	const announce = spi.open(sL,sB, (err) => {

		/* Only in this scope, receive buffer is available */
		announce.transfer(bootMessage, (err, bootMessage) => {
			announce.close(err =>{});
		});

		/* The bootloader will start a memory erase which will take some seconds to complete. After that, start the firmware upload */
		firmwareUploadTimeout = setTimeout(Module_FirmwareUpload, 2500);
	});
}

/***************************************************************************************/

function Module_FirmwareUpload(){
	var checksumCalculated = new Uint8Array(1);
	var sendbufferPointer;
	var messagePointer;

	fs.readFile(moduleFirmwareLocation + newFirmware, function(err, code){

		if (err) {
			//node.warn("Error opening firmware file");
			//node.status({fill:"red",shape:"dot",text:"Error opening firmware file"});
			console.log("error: unable to open firmware file")
			RestartServices();
			return;
		}

		var str = code.toString();
		var line = str.split('\n');
		var lineNumber = 0;

		if(!(line.length > 1)) {
			//node.warn("Firmware file corrupt");
			//node.status({fill:"red",shape:"dot",text:"Firmware file corrupt"});
			//initializeTimeout = setTimeout(InputModule_Initialize, 600);
			console.log("error: Firmware file corrupt");
			RestartServices();
			return;
		}

		const firmware = spi.open(sL,sB, (err) => {
			Module_SendFirmwareData();

			function Module_SendFirmwareData(){
		
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

				// if(checksumCalculated[0] != checksum)
				// {
					/* Annoying error message */
					// node.warn("Wrong file checksum: "+ checksumCalculated[0]);
				// }

				/* calculate checksum */
				sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

				firmware.transfer(bootMessage, (err, bootMessage) => {

				});

				if(messageType == 7){
					firmware.close(err =>{});
					//node.warn("Firmware from input module on slot: "+moduleSlot+" updated! Now restarting module!");
					/* At this point, the module can be restarted to check if it provides the new installed firmware */
					//console.log("Firmware uploaded")
					Module_StartReset();
					//TODO moet de module hier het initialisatie script aanroepen?
					return;
				} else {
					getFirmwareStatusTimeout = setTimeout(Module_GetFirmwareStatus, 3);
				}
			}

			/***************************************************************************************/

			function Module_GetFirmwareStatus(){
			
				sendBuffer[0] = 49;
				sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
				sendBuffer[2] = 49;

				/* calculate checksum */
				sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

				firmware.transfer(bootMessage, (err, bootMessage) => {

					if(receiveBuffer[BOOTMESSAGELENGTH-1] === ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1))
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
							//node.warn("Firmware checksum for input module on slot: "+moduleSlot+", error on line : "+lineNumber+" , going to retry!" );
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
										//node.warn("Firmware checksum for input module on slot: "+moduleSlot+", error on line : "+lineNumber+" , 5 times! Stop firmware update!" );
										console.log("error: checksum repeatedly didn't match during firmware upload\ncurrent firmware on the module might be corrupt!");
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

					sendFirmwareDataTimeout = setTimeout(Module_SendFirmwareData, 2);

				});

			}
		});

	});
}

/***************************************************************************************
** \brief	Function that controls the low level reset of the modules
** \param	State of the reset action
** \return	None
****************************************************************************************/
function Module_Reset(state){
    if(state === 1)
    {
    	fs.writeFileSync('/sys/class/leds/ResetM-' + String(slot) + '/brightness','255');
    }
    else
    {
    	fs.writeFileSync('/sys/class/leds/ResetM-' + String(slot) + '/brightness','0');
    }
}


function ArrayEquals(a, b) {
    return Array.isArray(a) &&
	Array.isArray(b) &&
	a.length === b.length &&
	a.every((val, index) => val === b[index]);
}