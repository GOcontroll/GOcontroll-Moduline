var i2c = require('i2c-bus');

var args = process.argv.slice(2)
const ledPulses = parseInt(args[0]);
var i = 0;
const leds = [1,2,3,4]
var state = false;
var pulseTimeout;
var i2c_present = true;
var ledRed 		= 0x0B;
var ledGreen 	= 0x0C;
var ledBlue 	= 0x0D;

/* Create dataholder for I2C object */
var i2c1;
	
var	sendBuffer = Buffer.alloc(10);

var ADDRESS = 0x14;


try {
    /* Open specific I2C port */
    i2c1 = i2c.openSync(2);

    /* First, reset the device */
    sendBuffer[0] = 0x17;
    sendBuffer[1] = 0xFF;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

    /* Second, enable the device (Chip_EN)*/
    sendBuffer[0] = 0x00;
    sendBuffer[1] = 0x40;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

    /* Close the I2C port */
    i2c1.closeSync();
} catch(err) {
    i2c_present = false
}

if (i2c_present){
    pulseTimeout = setTimeout(switch_leds, 200);
}

function switch_leds() {
    if (i >= ledPulses*2) {
        state = false;
        leds.forEach(switch_led)
        return;
    }
    leds.forEach(switch_led)
    i++;
    state = !state;
    clearTimeout(pulseTimeout);
    pulseTimeout = setTimeout(switch_leds,200);
}

function switch_led(item) {
    if(item == 1)
    {
        ledRed 		= 0x0B;
        ledGreen 	= 0x0C;
        ledBlue 	= 0x0D;
    }
    if(item == 2)
    {
        ledRed 		= 0x0E;
        ledGreen 	= 0x0F;
        ledBlue 	= 0x10;
    }
    if(item == 3)
    {
        ledRed 		= 0x11;
        ledGreen 	= 0x12;
        ledBlue 	= 0x13;
    }
    if(item == 4)
    {
        ledRed 		= 0x14;
        ledGreen 	= 0x15;
        ledBlue 	= 0x16;
    }
    if (state) {
        i2c1 = i2c.openSync(2);
        sendBuffer[0] = ledRed;
        sendBuffer[1] = 165;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

        sendBuffer[0] = ledGreen;
        sendBuffer[1] = 50;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

        sendBuffer[0] = ledBlue;
        sendBuffer[1] = 0;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
        i2c1.closeSync();
    } else {
        i2c1 = i2c.openSync(2);
        sendBuffer[0] = ledRed;
        sendBuffer[1] = 0;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

        sendBuffer[0] = ledGreen;
        sendBuffer[1] = 0;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);

        sendBuffer[0] = ledBlue;
        sendBuffer[1] = 0;
        i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
        i2c1.closeSync();
    }
}
