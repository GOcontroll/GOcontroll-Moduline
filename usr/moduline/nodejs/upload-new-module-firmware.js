const spi = require('spi-device');
const fs = require('fs');
var shell = require('shelljs');	

var args = process.argv.slice(2)
const slot = parseInt(args[0]);
const newFirmware = args[1];
var forceUpdate = parseInt(args[2])

if (!args[0] && !args[1]) {
    throw new Error("Provide arguments to use this script: command <module slot> <firmware.srec> <force update: 1 for yes, empty or else for no>");
}

fs.stat("/usr/module-firmware/" + newFirmware, (error, stats) => {
    if (error) {
        throw new Error("Firmware file does not exist, enter a valid firmware file");
    }
});


if (forceUpdate == 1) {
    console.log("Forcing update, I hope you know what you are doing.");
}


const moduleFirmwareLocation = "/usr/module-firmware/"
const BOOTMESSAGELENGTH = 46
const BOOTMESSAGELENGTHCHECK = 61
const SPISPEED = 2000000;

let nodered =  true; 
let simulink = true;

var controllerType, hardwareFile;
try {
    hardwareFile = fs.readFileSync("/sys/firmware/devicetree/base/hardware", "utf-8");
} catch(err) {
console.error(err);
}
if (hardwareFile.includes("Moduline IV")) {
    controllerType = "IV"
    if (slot<1|slot>8) {
        throw new Error("Incorrect slot number entered, must be a number ranging from 1 to 8");
    }
} else if (hardwareFile.includes("Moduline Mini")) {
    controllerType = "mini"
    if (slot<1|slot>4) {
        throw new Error("Incorrect slot number entered, must be a number ranging from 1 to 4");
    }
} else if (hardwareFile.includes("Moduline Screen")) {
    controllerType = "screen"
    if (slot<1|slot>2) {
        throw new Error("Incorrect slot number entered, must be a number ranging from 1 to 2");
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

var sendBuffer = Buffer.alloc(BOOTMESSAGELENGTHCHECK); 
var	receiveBuffer = Buffer.alloc(BOOTMESSAGELENGTHCHECK);

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

const escapeBootMessage = [{
    sendBuffer,
    receiveBuffer,
    byteLength: BOOTMESSAGELENGTHCHECK,
    speedHz: SPISPEED
}]

switch(controllerType)
{
    case "IV":
        switch(slot)
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

        break;
    case "mini":
        switch(slot)
        {
            case 1: sL = 1; sB=0; break;
            case 2: sL = 1; sB=1; break;
            case 3: sL = 2; sB=0; break;
            case 4: sL = 2; sB=1; break;
        }
        break;
    case "screen":
        switch(slot)
        {
            case 1: sL = 1; sB=0; break;
            case 2: sL = 1; sB=1; break;
        }
        break;
    default:
        break;
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
	resetTimeout = setTimeout(Module_StopReset, 10);
}

function Module_StopReset (){
    Module_Reset(0);	
    /*After reset, give the module some time to boot */
    /*Next step is to check for new available firmware */
    checkFirmwareTimeout = setTimeout(Module_CheckFirmwareVersion, 10);
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
                return;
            }
            else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
                console.log("error: Wrong response from bootloader");
                Module_CancelFirmwareUpload();
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

/***************************************************************************************
** \brief
**
**
** \param
** \param
** \return
**
****************************************************************************************/
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



/***************************************************************************************
** \brief
**
**
** \param
** \param
** \return
**
****************************************************************************************/
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

/**
 * normal function
 * | 0 /\  ||      | 0 /\  ||      | 1 /\  ||      | 2 /\  ||      | 3 /\  ||      | 4 /\  ||      | 5 /\  ||      | 6 /\  ||      | 7 /\  ||      | 8 /\  ||      |
 * |   ||  \/ junk |   ||  \/ 0    |   ||  \/ 0    |   ||  \/ 1    |   ||  \/ 2    |   ||  \/ 3    |   ||  \/ 4    |   ||  \/ 5    |   ||  \/ 6    |   ||  \/ 7    |
 * | lineNum    0  | lineNum    0  | lineNum    1  | lineNum    2  | lineNum    3  | lineNum    4  | lineNum    5  | lineNum    6  | lineNum    7  | lineNum    8  |
 * | lineCheck  0  | lineCheck  0  | lineCheck  0  | lineCheck  1  | lineCheck  2  | lineCheck  3  | lineCheck  4  | lineCheck  5  | lineCheck  6  | lineCheck  7  |
 * | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  |
 *
 * on error swap lineNum and lineCheck, on success after odd number of errors swap them and add one to lineNum
 * repeated single/odd number of errors
 * | 0 /\  ||      | 0 /\  ||      | 1 /\  ||      | 2 /\  ||      | 3 /\  ||      | 2 /\  ||      | 4 /\  ||      | 2 /\  ||      | 5 /\  ||      | 6 /\  ||      |
 * |   ||  \/ junk |   ||  \/ 0    |   ||  \/ 0    |   ||  \/ 1    |   ||  \/ err  |   ||  \/ 3    |   ||  \/ err  |   ||  \/ 4    |   ||  \/ 2    |   ||  \/ 5    |
 * | lineNum    0  | lineNum    0  | lineNum    1  | lineNum    2  | lineNum    3  | lineNum    2  | lineNum    4  | lineNum    2  | lineNum    5  | lineNum    6  |
 * | lineCheck  0  | lineCheck  0  | lineCheck  0  | lineCheck  1  | lineCheck  2  | lineCheck  3  | lineCheck  2  | lineCheck  4  | lineCheck  2  | lineCheck  5  |
 * | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 1  | errorCount 0  | errorCount 1  | errorCount 0  | errorCount 0  | errorCount 0  |
 *
 * repeated even number of errors
 * | 0 /\  ||      | 0 /\  ||      | 1 /\  ||      | 2 /\  ||      | 3 /\  ||      | 2 /\  ||      | 3 /\  ||      | 4 /\  ||      | 5 /\  ||      | 6 /\  ||      |
 * |   ||  \/ junk |   ||  \/ 0    |   ||  \/ 0    |   ||  \/ 1    |   ||  \/ err  |   ||  \/ err  |   ||  \/ 2    |   ||  \/ 3    |   ||  \/ 4    |   ||  \/ 5    |
 * | lineNum    0  | lineNum    0  | lineNum    1  | lineNum    2  | lineNum    3  | lineNum    2  | lineNum    3  | lineNum    4  | lineNum    5  | lineNum    6  |
 * | lineCheck  0  | lineCheck  0  | lineCheck  0  | lineCheck  1  | lineCheck  2  | lineCheck  3  | lineCheck  2  | lineCheck  3  | lineCheck  4  | lineCheck  5  |
 * | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 1  | errorCount 2  | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0  |
 * 
 * end of firmware
 * | n-1 /\  ||    | test/\  ||    | n /\  ||      | test/\  ||                   |
 * |     ||  \/ n-2|     ||  \/ n-1|   ||  \/ n-1  |     ||  \/ firmware response |
 * | lineNum    n-1| lineNum    n  | lineNum    n  | lineNum    n                 |
 * | lineCheck  n-2| lineCheck  n-1| lineCheck  n-1| lineCheck  n                 |
 * | errorCount 0  | errorCount 0  | errorCount 0  | errorCount 0                 |
 * 
 * end of firmware with error
 * | n-1 /\  ||    | test/\  ||    | n-1 /\  ||    | test/\  ||    | n /\  ||      | test/\  ||     | n /\  ||      | test/\  ||                   |
 * |     ||  \/ n-2|     ||  \/ err|     ||  \/junk|     ||  \/ n-1|   ||  \/ n-1  |     ||  \/ err |   ||  \/ junk |     ||  \/ firmware response |
 * | lineNum    n-1| lineNum    n  | lineNum    n-1| lineNum    n  | lineNum    n  | lineNum    n   | lineNum    n  | lineNum    n                 |
 * | lineCheck  n-2| lineCheck  n-1| lineCheck  n  | lineCheck  n-1| lineCheck  n-1| lineCheck  n   | lineCheck  n  | lineCheck  n                 |
 * | errorCount 0  | errorCount 1  | errorCount 2  | errorCount 0  | errorCount 0  | errorCount 0   | errorCount 0  | errorCount 0                 |
 */

/**
 * Upload a firmware file to a module\
 * Every line of the srec file gets checked so no invalid data is written to the module\
 * The feedback from the module runs one iteration behind
 */
function Module_FirmwareUpload(){
    var checksumCalculated = new Uint8Array(1);
    var sendbufferPointer;
    var messagePointer;

    fs.readFile(moduleFirmwareLocation + newFirmware, function(err, code){

        if (err) {
            console.log("error: unable to open firmware file")
            throw err;
        }

        var str = code.toString();
        var line = str.split('\n');
        var lineNumber = 0;
        
        
        if(!(line.length > 1)) {
            console.log("error: Firmware file corrupt")
            return;
        }

        const firmware = spi.openSync(sL,sB)
        var messageType = 0;
        while (messageType != 7){
            messageType =  parseInt(line[lineNumber].slice(1, 2),16);
            /* Get the decimal length of the specific line */
            var lineLength = parseInt((line[lineNumber].slice(2, 4)),16);
            var checksum = parseInt(line[lineNumber].slice((line[lineNumber].length - 3), line[lineNumber].length),16);

            /* messageType 7 will escape the bootloader we need to check the last line before we can send 7,
            otherwise this last line could be invalid and we might get some weird behaviour */
            if (messageType == 7 && firmwareLineCheck != lineNumber) {
                sendBuffer[0] = 49;
                sendBuffer[1] = BOOTMESSAGELENGTH -1;
                sendBuffer[2] = 49;
                sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
                firmware.transferSync(bootMessage);
                if (receiveBuffer[BOOTMESSAGELENGTH-1] === ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1) &&
                    firmwareLineCheck == receiveBuffer.readUInt16BE(6) &&
                    receiveBuffer[8] == 1) {
                        //success wait a bit before sending message 7.
                        var i = 0;
                        while (i < 15000) {
                            i++;
                        }
                } else {
                    [lineNumber, firmwareLineCheck] = [firmwareLineCheck,lineNumber];
                    messageType = 0;
                    continue;
                }
            }

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

            // TODO fix this?

            // if(checksumCalculated[0] != checksum)
            // {
            //     /* Annoying error message */
            //     console.log(newFirmware + " has an incorrect checksum")
            // }

            /* calculate checksum */
            sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

            /* send the firmware and check the response */
            firmware.transferSync(bootMessage);
            /* busy wait sucks but javascript doesn't have a proper sleep.
               without this wait the checksums start failing, bootloader probably needs the time to process */
            var i = 0;
            while (i < 15000) {
                i++;
            }
            // console.log(firmwareErrorCounter + " " + lineNumber + " " + firmwareLineCheck);
            if(receiveBuffer[BOOTMESSAGELENGTH-1] === ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1))
            {
                /* Check if received data complies with the actual line number from the .srec file */
                if(firmwareLineCheck == receiveBuffer.readUInt16BE(6))
                {
                    /* Check if the returned line is correctly received by module*/
                    if(receiveBuffer[8] == 1)
                    {
                        
                        if (firmwareErrorCounter%2==1) {
                            /* if there is an uneven number of faults before success we gotta do some funky stuff,
                            the check counter and the line counter need to be swapped after that line counter goes up by 1 */
                            [lineNumber, firmwareLineCheck] = [firmwareLineCheck,lineNumber];
                        } else {
                            /* let firmwareLineCheck run one behind because we are checking the response to the previous message */
                            firmwareLineCheck = lineNumber;
                        }
                        /* last line of the file is reached some special handling for that due to the reading one byte late */
                        if (messageType == 7) {
                            sendBuffer[0] = 49;
                            sendBuffer[1] = BOOTMESSAGELENGTH -1;
                            sendBuffer[2] = 49;
                            sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);
                            var i = 0;
                            while (i < 15000) {
                                i++;
                            }
                            firmware.transferSync(escapeBootMessage);
                            if (!(receiveBuffer[receiveBuffer[1]] === ChecksumCalculator(receiveBuffer, receiveBuffer[1])
                                && receiveBuffer[6] == 20)){ // must receive 20 from module firmware {
                                    /* last line was not received correctly so we try again */
                                    messageType = 0;
                                }
                        } else {
                            /* At this position, the module has received the line correct so jump to next line */
                            lineNumber++;
                            firmwareErrorCounter = 0;
                        }
                    }
                    else
                    {
                        // console.log("module checksum fault");
                        /* something went wrong go back to do it again */
                        [lineNumber, firmwareLineCheck] = [firmwareLineCheck,lineNumber];
                        messageType = 0;
                        firmwareErrorCounter ++;
                    
                        if(firmwareErrorCounter > 10)
                        {
                            console.log("error: checksum repeatedly didn't match during firmware upload")
                            firmwareErrorCounter = 0;
                            return;
                        }
                    }
                } else {
                    // console.log("expected line " + receiveBuffer.readUInt16BE(6));
                    /* something went wrong go back to do it again */
                    [lineNumber, firmwareLineCheck] = [firmwareLineCheck,lineNumber];
                    messageType = 0;
                    firmwareErrorCounter ++;
                
                    if(firmwareErrorCounter > 10)
                    {
                        console.log("error: checksum repeatedly didn't match during firmware upload")
                        firmwareErrorCounter = 0;
                        return;
                    }
                }
            } else {
                // console.log("checksum fault");
                /* something went wrong go back to do it again */
                [lineNumber, firmwareLineCheck] = [firmwareLineCheck,lineNumber];
                messageType = 0;
                firmwareErrorCounter ++;
            
                if(firmwareErrorCounter > 10)
                {
                    console.log("error: checksum repeatedly didn't match during firmware upload")
                    firmwareErrorCounter = 0;
                    return;
                }
            }
        }

        firmware.closeSync();
        /* At this point, the module can be restarted to check if it provides the new installed firmware */
        Module_StartReset();
        return;
    });	
}

/***************************************************************************************
** \brief	Function that controls the low level reset of the modules
**
** \param	State of the reset action
** \return	None
**
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