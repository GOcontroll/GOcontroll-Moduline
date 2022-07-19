const spi = require('spi-device');
const fs = require('fs');

const BOOTMESSAGELENGTH = 46;
/* Assigned dynamically */
var MESSAGELENGTH 	= 0;
const SPISPEED = 2000000;
const moduleFirmwareLocation = "/usr/module-firmware/";
//check what type of controller?

var currentModuleSlot;
var sL, sB;
var controllerLayout = Buffer.alloc(8);

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

var spiReady = false;

/*Different controllers have different spi bus to module slot layouts*/
switch(controllerType)
{
    case "IV":
        for (var moduleSlot = 1; moduleSlot <9; moduleSlot++){
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
            currentModuleSlot = moduleSlot;
            SendDummyByte();
        };
        break;
    case "mini":
        for (var moduleSlot = 1; moduleSlot <5; moduleSlot++){
            switch(moduleSlot)
            {
                case 1: sL = 2; sB=0; break;
                case 2: sL = 2; sB=1; break;
                case 3: sL = 1; sB=0; break;
                case 4: sL = 1; sB=1; break;
            }
        };
        break;
    case "dash?":
        for (var moduleSlot = 1; moduleSlot <3; moduleSlot++){
            switch(moduleSlot)
            {
                case 1: sL = 2; sB=0; break;
                case 2: sL = 2; sB=1; break;
            }
        };
        break;
    default:
        break;

}


fs.writeFile("/usr/module-firmware/modules.txt",controllerLayout.join(":"), err => {
    if (err) {
        console.error(err)
    }
});

const getData = spi.open(sL,sB, (err) => {
    if(!err)
    {
    spiReady = true;
    } 
});

function SendDummyByte(){
		
    /*Send dummy message to setup the SPI bus properly */
    const dummy = spi.open(sL,sB, (err) => {
        
        /* Only in this scope, receive buffer is available */
    dummy.transfer(dummyMessage, (err, dummyMessage) => {
    dummy.close(err =>{});
    
    /* Here we start the reset routine */
    //resetTimeout = setTimeout(OutputModule_StartReset, 50);
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
    InputModule_Reset(0);	
    /*After reset, give the module some time to boot */
    /*Next step is to check for new available firmware */
    checkFirmwareTimeout = setTimeout(Module_CheckFirmwareVersion, 100);
}

function Module_CheckFirmwareVersion(){
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
            node.warn("Checksum from bootloader not correct");
            Module_CancelFirmwareUpload();
            return;
            }
            else if(	receiveBuffer[0] != 9 || receiveBuffer[2] != 9){
            node.warn("Wrong response from bootloader");
            Module_CancelFirmwareUpload();
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
            firmwareName = swVersion.join("-")

            controllerLayout[currentModuleSlot] = firmwareName
        });
    });
    firmware.close(err =>{});
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

function Module_CancelFirmwareUpload(){
    sendBuffer[0] = 19;
    sendBuffer[1] = BOOTMESSAGELENGTH-1; // Messagelength from bootloader
    sendBuffer[2] = 19;
    
    sendBuffer[BOOTMESSAGELENGTH-1] = InputModule_ChecksumCalculator(sendBuffer, BOOTMESSAGELENGTH-1);

        const cancel = spi.open(sL,sB, (err) => {

        cancel.transfer(bootMessage, (err, bootMessage) => {
        cancel.close(err =>{});});
        /* At this point, The module can be initialized */
        //initializeTimeout = setTimeout(InputModule_Initialize, 600);
        });

    }

function Module_Reset(state){
    if(state === 1)
    {
    fs.writeFileSync('/sys/class/leds/ResetM-' + String(currentModuleSlot) + '/brightness','255');
    }
    else
    {
    fs.writeFileSync('/sys/class/leds/ResetM-' + String(currentModuleSlot) + '/brightness','0');
    }
}