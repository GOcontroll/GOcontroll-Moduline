const spi = require('spi-device');
const fs = require('fs');

const BOOTMESSAGELENGTH = 46;
const SPISPEED = 2000000;

//check what type of controller?
var controllerType, hardwareFile;
try {
    hardwareFile = fs.readFileSync("/sys/firmware/devicetree/base/hardware", "utf-8");
} catch(err) {
console.error(err);
}
if (hardwareFile.includes("Moduline IV")) {
    controllerType = "IV"
} else if (hardwareFile.includes("Moduline Mini")) {
    controllerType = "mini"
}

var sL, sB;
var controllerLayout = new Array(8);

var sendBuffer = Buffer.alloc(BOOTMESSAGELENGTH+5);
var receiveBuffer = Buffer.alloc(BOOTMESSAGELENGTH+5);

const bootMessage = [{
    sendBuffer,
    receiveBuffer,
    byteLength: BOOTMESSAGELENGTH+1,
    speedHz: SPISPEED
}];

const dummyMessage = [{
    sendBuffer,
    receiveBuffer,
    byteLength: 5,
    speedHz: SPISPEED
}]

var currentSlot = 1;
var amountOfSlots;

recursionFunc();

/*this function get recursively called to keep this process synchronous*/
function recursionFunc() {
    /*Different controllers have different spi bus to module slot layouts*/
    switch(controllerType)
    {
        case "IV":
            amountOfSlots = 8;
            switch(currentSlot)
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
            SendDummyByte(sL, sB, currentSlot);
            break;
        case "mini":
            amountOfSlots = 4;
            switch(moduleSlot)
            {
                case 1: sL = 2; sB=0; break;
                case 2: sL = 2; sB=1; break;
                case 3: sL = 1; sB=0; break;
                case 4: sL = 1; sB=1; break;
            }
            SendDummyByte(sL, sB, currentSlot);
            break;
        case "dash?":
            switch(moduleSlot)
            {
                case 1: sL = 2; sB=0; break;
                case 2: sL = 2; sB=1; break;
            }
            SendDummyByte(sL, sB, currentSlot);
            break;
        default:
            break;

    }
}

function SendDummyByte(bus, dev, moduleSlot){
    /*Send dummy message to setup the SPI bus properly */
    const dummy = spi.open(bus, dev, (err) => {
        
        /* Only in this scope, receive buffer is available */
    dummy.transfer(dummyMessage, (err, dummyMessage) => {
    dummy.close(err =>{});
    
    resetTimeout = setTimeout(Module_StartReset, 50, bus, dev, moduleSlot);
    });

    });
}

function Module_StartReset (bus, dev, moduleSlot){
	/*Start module reset */
	Module_Reset(1, moduleSlot);
	/*Give a certain timeout so module is reset properly*/
	resetTimeout = setTimeout(Module_StopReset, 200, bus, dev, moduleSlot);
}

function Module_StopReset (bus, dev, moduleSlot){
    Module_Reset(0, moduleSlot);	
    /*After reset, give the module some time to boot */
    /*Next step is to check for new available firmware */
    checkFirmwareTimeout = setTimeout(Module_CheckFirmwareVersion, 100, bus, dev, moduleSlot);
}

function Module_CheckFirmwareVersion(bus, dev, moduleSlot){
    var swVersion = new Array(7);
	/* Construct the firmware check message */ 
	sendBuffer[0] = 9;
	sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
	sendBuffer[2] = 9;
    console.log(moduleSlot)
	/* calculate checksum */
	sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

    const firmware = spi.open(bus,dev, (err) => {
        /* Only in this scope, receive buffer is available */
        firmware.transfer(bootMessage, (err, bootMessage) => {


            if(receiveBuffer[BOOTMESSAGELENGTH-1] != ChecksumCalculator(receiveBuffer, BOOTMESSAGELENGTH-1)){
                Module_CancelFirmwareUpload(bus, dev);
                return;
            }
            else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
                Module_CancelFirmwareUpload(bus, dev);
                return;
            }

            /* Still here so extract current firmware*/
            swVersion[0] = String(receiveBuffer[6]);
            swVersion[1] = String(receiveBuffer[7]);
            swVersion[2] = String(receiveBuffer[8]);
            swVersion[3] = String(receiveBuffer[9]);
            
            swVersion[4] = String(receiveBuffer[10]);
            swVersion[5] = String(receiveBuffer[11]);
            swVersion[6] = String(receiveBuffer[12]);

            console.log(swVersion);
            firmwareName = swVersion.join("-");
            controllerLayout[moduleSlot-1] = firmwareName;
        });
    });
    currentSlot++;
    if (currentSlot <= amountOfSlots) {
        recursionTimeout = setTimeout(recursionFunc, 200);
    } else {
        fs.writeFile('/usr/module-firmware/modules.txt', controllerLayout.join(":"), err => {
            if (err) {
                console.error(err);
            }
        });
    }
}

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

function Module_CancelFirmwareUpload(bus, dev){
    sendBuffer[0] = 19;
    sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
    sendBuffer[2] = 19;
    
    sendBuffer[BOOTMESSAGELENGTH-1] = ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

    const cancel = spi.open(bus,dev, (err) => {

    cancel.transfer(bootMessage, (err, bootMessage) => {
    cancel.close(err =>{});});
    /* At this point, The module can be initialized */
    });
}
    

function Module_Reset(state, moduleSlot){
    if(state === 1)
    {
    fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','255');
    }
    else
    {
    fs.writeFileSync('/sys/class/leds/ResetM-' + String(moduleSlot) + '/brightness','0');
    }
}
