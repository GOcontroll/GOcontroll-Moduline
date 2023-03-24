const can = require("socketcan");
const fs = require('fs');
const i2c = require('i2c-bus');

//check what type of controller?
var controllerType, hardwareFile;
var canBusCount = 0;
var thread_can0, thread_can2;
var thread_can0_count, thread_can2_count;
var finished_tests = 0;
var failed_tests = 0;
var i2c_bus_state;
var error_log =  "error log:\n";

var ledRed 		= 0x0B;
var ledGreen 	= 0x0C;
var ledBlue 	= 0x0D;

var data = Buffer.alloc(8);
    data.writeUint8(0x01,0);
    data.writeUint8(0x02,1);
    data.writeUint8(0x03,2);
    data.writeUint8(0x04,3);
    data.writeUint8(0x05,4);
    data.writeUint8(0x06,5);
    data.writeUint8(0x07,6);
    data.writeUint8(0x08,7);

    try {
        led_init();
        i2c_bus_state = true;
    } catch (err) {
        error_log += "I2C bus not functioning, led address not found\n"
        i2c_bus_state = false;
    }

try {
    hardwareFile = fs.readFileSync("/sys/firmware/devicetree/base/hardware", "utf-8");
} catch(err) {
console.error(err);
}
if (hardwareFile.includes("Moduline IV")) {
    controllerType = "IV"
    canBusCount = 4;
    set_led(0, "blue");
    set_led(1, "blue");
    set_led(2, "blue");
    set_led(3, "blue");

} else if (hardwareFile.includes("Moduline Mini")) {
    controllerType = "mini"
    canBusCount = 2;
    set_led(0, "blue");
    set_led(1, "blue");
} else if (hardwareFile.includes("Moduline Screen")) {
    controllerType = "screen"
    canBusCount = 2;
    error_log =  "error log:\n";
}


var channel0;
try {
    channel0 = can.createRawChannel("can0", true);
    channel0.addListener("onMessage", function(frame){
        if(Buffer.compare(frame.data, data) === 0) {
            thread_can0 = false;
            // console.log(frame);
            // console.log("respose received on can0");
            channel1.stop();
            channel0.stop();
            test_succeeded(0);
            test_succeeded(1);
        }
    });
    channel0.start();
    thread_can0 = true;
}catch(ex) {
    error_log += "CAN not found:0\n";
    thread_can0 = false;
    test_failed(0)
}

var channel1;
try {
    channel1 = can.createRawChannel("can1", true);
    if (thread_can0){
        channel1.addListener("onMessage", channel1.send, channel1);
        channel1.start();
    }
}catch(ex) {
    error_log += "CAN not found:1\n";
    thread_can0 = false;
    test_failed(1);
    test_failed(0);
}

if(canBusCount >= 4) {
    var channel2;
    try {
        channel2 = can.createRawChannel("can2", true);
        channel2.addListener("onMessage", function(frame){
            if(Buffer.compare(frame.data, data) === 0) {
                thread_can2 = false;
                // console.log(frame);
                // console.log("respose received on can2");
                channel3.stop();
                channel2.stop();
                test_succeeded(2);
                test_succeeded(3);
            }
        });
        channel2.start();
        thread_can2 = true;
    }catch(ex) {
        error_log += "CAN not found:2\n";
        thread_can2 = false;
        test_failed(2)
    }


    var channel3;
    try {
        channel3 = can.createRawChannel("can3", true);
        if ( thread_can2) {
            channel3.addListener("onMessage", channel3.send, channel3);
            channel3.start();
        }
    }catch(ex) {
        error_log += "CAN not found:3\n";
        thread_can2 = false;
        test_failed(3);
        test_failed(2);
    }
} else {
    thread_can2 = false;
}

thread_can0_count = 0;
thread_can2_count = 0;

interval = setInterval(SendCan_DataOut, 1000);
function SendCan_DataOut(){
    if(thread_can0) {
        thread_can0_count ++;
        try{
            // console.log("sending on can0")
            channel0.send({id: parseInt("2",16),
            ext: false,
            data: data});
        } catch(ex) {
            error_log += "Unable to send on can0\n";
        }
        if (thread_can0_count >=5) {
            error_log += "No communication between can0 and can1\n";
            test_failed(0);
            test_failed(1);
            thread_can0 = false;
        }
    }
    if(thread_can2) {
        thread_can2_count ++;
        try{
            // console.log("sending on can2")
            channel2.send({id: parseInt("2",16),
            ext: false,
            data: data});
        } catch(ex) {
            error_log += "Unable to send on can2\n";
        }
        if (thread_can2_count >=5) {
            error_log += "No communication between can2 and can3\n";
            test_failed(2);
            test_failed(3);
            thread_can2 = false;
        }
    }
}

function test_failed(number) {
    set_led(number, "red")
    finished_tests ++;
    if (finished_tests>= canBusCount) {
        console.log("FAIL: some can bus(ses) did not pass the test.")
        console.log(error_log);
        if (i2c_bus_state){
            setTimeout(end_test, 5000, 0);
        } else {
            process.exit(-2);
        }
    }
}

function test_succeeded(number) {
    set_led(number, "green")
    finished_tests ++;
    if (finished_tests >= canBusCount) {
        if (failed_tests > 0) {
            console.log("FAIL: some can bus(ses) did not pass the test.")
            console.log(error_log);
            if (i2c_bus_state){
                setTimeout(end_test, 5000, 0);
            } else {
                process.exit(-1);
            }
        }
        console.log("PASS: All canbusses are functioning")
        console.log(error_log);
        if (i2c_bus_state){
            setTimeout(end_test, 5000, 0);
        } else {
            process.exit(0);
        }
    }
}

function set_led(num, colour){
    if (i2c_bus_state == false) {
        return;
    }
    if(num == 0)
    {
    ledRed 		= 0x0B;
    ledGreen 	= 0x0C;
    ledBlue 	= 0x0D;
    }
    if(num == 1)
    {
    ledRed 		= 0x0E;
    ledGreen 	= 0x0F;
    ledBlue 	= 0x10;
    }
    if(num == 2)
    {
    ledRed 		= 0x11;
    ledGreen 	= 0x12;
    ledBlue 	= 0x13;
    }
    if(num == 3)
    {
    ledRed 		= 0x14;
    ledGreen 	= 0x15;
    ledBlue 	= 0x16;
    }

    	/* Create dataholder for I2C object */
	var i2c1;

	var	sendBuffer = Buffer.alloc(10);

	var ADDRESS = 0x14;

    /* Open specific I2C port */
	i2c1 = i2c.openSync(2);

    /* Control Red LED */
    if(colour=="red")
    {
    sendBuffer[0] = ledRed;
    sendBuffer[1] = 127;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledBlue;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledGreen;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    }

    if (colour=="green")
    {
    sendBuffer[0] = ledGreen;
    sendBuffer[1] = 127;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledBlue;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledRed;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    }

    if (colour == "blue")
    {
    sendBuffer[0] = ledBlue;
    sendBuffer[1] = 127;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledRed;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledGreen;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    }

    if (colour == "off")
    {
    sendBuffer[0] = ledBlue;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledRed;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    sendBuffer[0] = ledGreen;
    sendBuffer[1] = 0;
    i2c1.i2cWriteSync(ADDRESS, 2, sendBuffer);
    }

    /* Close the I2C port */
    i2c1.closeSync();
}

function led_init() {
    var i2c1;

	var	sendBuffer = Buffer.alloc(10);

	var ADDRESS = 0x14;

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
    i2c1.closeSync();
}

function end_test(exitCode) {
    if (i2c_bus_state) {
        for (let i = 0; i < 4; i ++) {
            set_led(i, "off");
        }
    }
    process.exit(exitCode);
}