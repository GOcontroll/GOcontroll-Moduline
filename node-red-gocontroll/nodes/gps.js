module.exports = function(RED) {
    "use strict"
	
	var cron = require("cron");
	var SerialPort = require("serialport");

	const port = new SerialPort("/dev/ttyUSB2", { baudRate: 115200 , autoOpen: false })

	var gpsFix = 0;
	var date = 0;
	var time = 0;
	var latitude = 0;
	var longitude = 0;
	var altitude = 0;
	var groundSpeed = 0;
	var satView = 0;
	var satUse = 0;

	function GOcontrollGPS(config) { 	 
	   RED.nodes.createNode(this,config);

        var node = this;
		const sampleTime = 1000;

		
		port.open(function (err) {
			if (err) {
			
			}
		});
		

		port.write("AT+CGNSPWR=1\r",function(err,res) {
			if (err) {

			}
		});


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

		port.write("AT+CGNSINF\r",function(err,res) {
			if (err) {
			var errmsg = err.toString().replace("Serialport","Serialport "+node.port.serial.path);
			node.error(errmsg,msg);
			}
		});
		
		msg.payload =  {"date" : date,
						"time" : time,
						"gpsFix" : gpsFix,
						"latitude" : latitude,
						"longitude" : longitude,
						"altitude" : altitude,
						"groundSpeed" : groundSpeed,
						"satView" : satView,
						"satUse" : satUse}
		
		node.send(msg)
    });
	
	}
	
		port.on('readable', function () {

		var data = port.read(); 
	
		if (data != null)
		{		
		var gpsData = data.toString('utf8').split(',');
		}
				
		if(gpsData[1] != null)
		{
		gpsFix = gpsData[1];
		}
		
		if(gpsData[2] != null)
		{
		date = (gpsData[2].slice(0, 4) + "-" + gpsData[2].slice(4, 6) + "-" + gpsData[2].slice(6, 8));
		time = (gpsData[2].slice(8, 10) + ":" + gpsData[2].slice(10, 12) + ":" + gpsData[2].slice(12, 14));
		}
		
		if(gpsData[3] != null)
		{
		latitude = gpsData[3];
		}
		
		if(gpsData[4] != null)
		{
		longitude = gpsData[4];
		}
		
		if(gpsData[5] != null)
		{
		altitude = gpsData[5];
		}
		
		if(gpsData[6] != null)
		{
		groundSpeed = gpsData[6];
		}

		if(gpsData[14] != null)
		{
		satView = gpsData[14];
		}		
		
		if(gpsData[15] != null)
		{
		satUse = gpsData[15];
		}	
		
	});

	RED.nodes.registerType("GPS",GOcontrollGPS);

	    GOcontrollGPS.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
        } else if (this.cronjob != null) {
            this.cronjob.stop();
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
            delete this.cronjob;
        }
		
		RED.log.info(RED._("close port",port));
		port.close();

    };
	
}