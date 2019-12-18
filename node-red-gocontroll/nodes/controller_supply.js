module.exports = function(RED) {
    "use strict"
	
	var cron = require("cron");
	var i2c = require('i2c-bus');

	function GOcontrollControllerSupply(config) { 	 
	   RED.nodes.createNode(this,config);
	   
		this.sampleTime = config.sampleTime;

        var node = this;
		
		var	sendBuffer = Buffer.alloc(10);
		var	receiveBufferSignal1 = Buffer.alloc(3);
		var	receiveBufferSignal2 = Buffer.alloc(3);

		const decimalFactor = 3.34 / 4095;
		
		/* http://www.farnell.com/datasheets/2000950.pdf?_ga=2.222638424.279214111.1560944243-564480314.1541320539 */
		/* MAX11645 */
		
		/* Configure I2C ADC convertor */
		const MAX_ADDR = 0x36;
		/* MSB is 1 */
		const MAX_SETUP = 0xA2;
		/* MSB is 0 */
		const MAX_CONVERT1 = 0x61;

		const MAX_CONVERT0 = 0x63;

		 const i2c1 = i2c.openSync(1);
		 
		 sendBuffer[0] = MAX_SETUP;
		 
		 i2c1.i2cWriteSync(MAX_ADDR, 1, sendBuffer);
		 i2c1.closeSync();

		
		/*Convert the sampletime */		
		const sampleTime = parseInt(this.sampleTime);

		/***start timed event *******/
		  node.repeaterSetup = function () {
          if (!isNaN(sampleTime) && sampleTime >= 10) {		
			if (RED.settings.verbose) {
			node.log("verbose setting");			
            }
            this.interval_id = setInterval(function() {
            node.emit("input", {});
            },sampleTime);
          } else if (this.crontab) {
            if (RED.settings.verbose) {
			node.log("verbose settings");	
            }
            this.cronjob = new cron.CronJob(this.crontab, function() { node.emit("input", {}); }, null, true);
          }
        };
		
		/***start timed event *******/
		node.repeaterSetup();

		/***execution initiated by event *******/
		node.on('input', function(msg) {

		 const i2c1 = i2c.openSync(1);
		 
		 sendBuffer[0] = MAX_CONVERT0;
		 i2c1.i2cWriteSync(MAX_ADDR, 1, sendBuffer);
		 i2c1.i2cReadSync(MAX_ADDR, 2, receiveBufferSignal1);
		 
		 sendBuffer[0] = MAX_CONVERT1;
		 i2c1.i2cWriteSync(MAX_ADDR, 1, sendBuffer);
 		 i2c1.i2cReadSync(MAX_ADDR, 2, receiveBufferSignal2);
		 
		 i2c1.closeSync();


		var batteryVoltage = ((((receiveBufferSignal1[1] | ((receiveBufferSignal1[0] & 0x0f)<<8)) * decimalFactor)/1.5)*11700).toFixed(0);
		var contactVoltage = ((((receiveBufferSignal2[1] | ((receiveBufferSignal2[0] & 0x0f)<<8)) * decimalFactor)/1.5)*11700).toFixed(0); 
		

  						msg.payload = {
							"batteryVoltage": batteryVoltage,
							"contactVoltage": contactVoltage,
							}
		node.send(msg);
    });
}
	RED.nodes.registerType("Controller-Supply",GOcontrollControllerSupply);

	    GOcontrollControllerSupply.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
        } else if (this.cronjob != null) {
            this.cronjob.stop();
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
            delete this.cronjob;
        }
    };
}