module.exports = function(RED) {
    "use strict"
	
	var i2c = require('i2c-bus');

	function GOcontrollControllerSupply(config) { 	 
	   RED.nodes.createNode(this,config);
	   
	   	var interval = null;
	   
		const sampleTime = config.sampleTime;

        var node = this;
		
		var	sendBuffer = Buffer.alloc(10);
		var	receiveBufferSignal1 = Buffer.alloc(3);
		var	receiveBufferSignal2 = Buffer.alloc(3);
		var	receiveBufferSignal3 = Buffer.alloc(3);
		var	receiveBufferSignal4 = Buffer.alloc(3);

		var decimalFactor = 3.34 / 4095;
		
		var moduline = 0;
		
		var ADDR;
		var SETUP;
		var CONVERT;
		var CONVERT0;
		var CONVERT1;
		var CONVERT2;
		var CONVERT3;
		var CONVERTGEN;
		
		var i2c1;
		var adcDevice;
		
		/* Check for moduline 3 ADC */
		i2c1 = i2c.openSync(1);
		
		adcDevice = i2c1.scanSync(0x36);
		if(adcDevice[0]==0x36){
		moduline = 3;
		}
		
		i2c1.closeSync();
		
		/* Check for moduline 4 ADC */
		i2c1 = i2c.openSync(2);
		
		adcDevice = i2c1.scanSync(0x48);
		if(adcDevice[0]==0x48){
		moduline = 4;
		}
		
		i2c1.closeSync();

		if(moduline == 3){
		/* On moduline 3 the reference voltage is vdd (3.3V and full scale resolution is 4095 (12-bit positive )) */
		decimalFactor = 3.34 / 4095;
		/* http://www.farnell.com/datasheets/2000950.pdf?_ga=2.222638424.279214111.1560944243-564480314.1541320539 */
		/* MAX11645 */
		/* Configure I2C ADC convertor */
		ADDR = 0x36;
		/* MSB is 1 */
		SETUP = 0xA2;
		/* MSB is 0 */
		CONVERT0 = 0x63;
		CONVERT1 = 0x61;
		
		/* MAXIM ADC needs to be configured once */
		i2c1 = i2c.openSync(1);
		sendBuffer[0] = SETUP;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		i2c1.closeSync();
		
		}
		else if (moduline == 4){
		/* On moduline 3 the reference voltage is vdd (3.3V and full scale resolution is 4095 (12-bit positive )) */
		decimalFactor = 4.095 / 2047;
		/* http://www.ti.com/lit/ds/symlink/ads1013.pdf */
		/* ADS1015 */
		/* Address of ADC convertor */
		ADDR = 0x48;
		SETUP = 0x01;
		CONVERT = 0x00;
		CONVERT0 = 0xC3;
		CONVERT1 = 0xD3;
		CONVERT2 = 0xE3;
		CONVERT3 = 0xF3;
		CONVERTGEN = 0x83;
		}

		
		/*Start scheduler */		
		interval = setInterval(getVoltages, parseInt(sampleTime));

		/***execution initiated by event *******/
		node.on('input', function(msg) {
    });
	
	var msgOut={};
	function getVoltages(){
		if(moduline == 3){
		i2c1 = i2c.openSync(1);
		
		/* Read channel 0 */
		sendBuffer[0] = SETUP;
		//sendBuffer[1] = CONVERT0;
		//sendBuffer[2] = CONVERTGEN;
		i2c1.i2cWriteSync(ADDR, 3, sendBuffer);	
		
		sendBuffer[0] = CONVERT0;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal1);
		
		sendBuffer[0] = CONVERT1;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
 		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal2); 
		
		
		var batteryVoltage = ((((receiveBufferSignal1[1] | ((receiveBufferSignal1[0] & 0x0f)<<8)) * decimalFactor)/1.5)*11700).toFixed(0);
		var contactVoltage = ((((receiveBufferSignal2[1] | ((receiveBufferSignal2[0] & 0x0f)<<8)) * decimalFactor)/1.5)*11700).toFixed(0); 
		
		msgOut["batteryVoltage"] = batteryVoltage;
		msgOut["K15-1"] = contactVoltage;
		
		node.send(msgOut);
		}
		
		else if (moduline == 4){
		i2c1 = i2c.openSync(2);
		
		/* Set multiplexer for channel 0*/
		sendBuffer[0] = SETUP;
		sendBuffer[1] = CONVERT0;
		sendBuffer[2] = CONVERTGEN;
		i2c1.i2cWriteSync(ADDR, 3, sendBuffer);		
		/* Set read channel to send converted value */
		sendBuffer[0] = CONVERT;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		/* Read actual value. Since this is the former conversion. Battery voltage is measured*/
		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal1);
		var batteryVoltage = ((receiveBufferSignal1[0]<<4) | ((receiveBufferSignal1[1] & 0xf0)>>4));
		
		/* Check if the value is not negative (see datasheet from ADC)*/
		if(batteryVoltage > 2047){
		batteryVoltage = 0;
		}
			
		
		/* Set multiplexer for channel 1*/
		sendBuffer[0] = SETUP;
		sendBuffer[1] = CONVERT1;
		sendBuffer[2] = CONVERTGEN;
		i2c1.i2cWriteSync(ADDR, 3, sendBuffer);		
		/* Set read channel to send converted value */
		sendBuffer[0] = CONVERT;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		/* Read actual value. Since this is the former conversion. Activate 1 is measured*/
		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal2);
		var active1Voltage = ((receiveBufferSignal2[0]<<4) | ((receiveBufferSignal2[1] & 0xf0)>>4));
		
		/* Check if the value is not negative (see datasheet from ADC)*/
		if(active1Voltage > 2047){
		active1Voltage = 0;
		}
		
		/* Set multiplexer for channel 2*/
		sendBuffer[0] = SETUP;
		sendBuffer[1] = CONVERT2;
		sendBuffer[2] = CONVERTGEN;
		i2c1.i2cWriteSync(ADDR, 3, sendBuffer);		
		/* Set read channel to send converted value */
		sendBuffer[0] = CONVERT;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		/* Read actual value. Since this is the former conversion. Activate 2 is measured*/
		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal3);
		
		var active2Voltage = ((receiveBufferSignal3[0]<<4) | ((receiveBufferSignal3[1] & 0xf0)>>4));
		/* Check if the value is not negative (see datasheet from ADC)*/
		if(active2Voltage > 2047){
		active2Voltage = 0;
		}
		
		/* Set multiplexer for channel 3*/
		sendBuffer[0] = SETUP;
		sendBuffer[1] = CONVERT3;
		sendBuffer[2] = CONVERTGEN;
		i2c1.i2cWriteSync(ADDR, 3, sendBuffer);		
		/* Set read channel to send converted value */
		sendBuffer[0] = CONVERT;
		i2c1.i2cWriteSync(ADDR, 1, sendBuffer);
		/* Read actual value. Since this is the former conversion. Activate 3 is measured*/
		i2c1.i2cReadSync(ADDR, 2, receiveBufferSignal4);
		
		var active3Voltage = ((receiveBufferSignal4[0]<<4) | ((receiveBufferSignal4[1] & 0xf0)>>4));
		/* Check if the value is not negative (see datasheet from ADC)*/
		if(active3Voltage > 2047){
		active3Voltage = 0;
		}
		i2c1.closeSync();		
		
		msgOut["batteryVoltage"] = (((batteryVoltage * decimalFactor)/1.5)*11700).toFixed(0);
		msgOut["K15-1"] = (((active1Voltage * decimalFactor)/1.5)*11700).toFixed(0);
		msgOut["K15-2"] = (((active2Voltage * decimalFactor)/1.5)*11700).toFixed(0);
		msgOut["K15-3"] = (((active3Voltage * decimalFactor)/1.5)*11700).toFixed(0);
		
		node.send(msgOut);	
		}
	}
	
	node.on('close', function(done) {
	clearInterval(interval);
	done();
	});
	
}
	RED.nodes.registerType("Controller-Supply",GOcontrollControllerSupply);
	
}