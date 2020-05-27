module.exports = function(RED) {
    "use strict"

	var SerialPort = require("serialport");

	function GOcontrollGPS(config) { 	 
	   RED.nodes.createNode(this,config);

		/* Serial port used for simcom on Moduline 4 */
		const port = new SerialPort("/dev/ttymxc1", { baudRate: 115200 , autoOpen: false })

		var interval = null;
		
		var gpsFix = 0;
		var date = 0;
		var time = 0;
		var latitude = 0;
		var longitude = 0;
		var altitude = 0;
		var groundSpeed = 0;
		var satView = 0;
		var satUse = 0;

		var dataString = "";

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

		/* Start interval to get module data */
		interval = setInterval(sendGpsData, sampleTime);

		/***execution initiated by event *******/
		node.on('input', function(msg) {

		});
	
		var msgOut={};
		function sendGpsData(){
			
			port.write("AT+CGNSINF\r",function(err,res) {
				if (err) {
				var errmsg = err.toString().replace("Serialport","Serialport "+node.port.serial.path);
				node.error(errmsg,msg);
				}
				
			});
					
			msgOut["date"] = date;
			msgOut["time"] = time;
			msgOut["gpsFix"] = gpsFix;
			msgOut["latitude"] = latitude;
			msgOut["longitude"] = longitude;
			msgOut["altitude"] = altitude;
			msgOut["groundSpeed"] = groundSpeed;
			msgOut["satView"] = satView;
			msgOut["satUse"] = satUse;

			node.send(msgOut)	
		}
		
		if(msgOut["gpsFix"] == null)
		{
			port.write("AT+CGNSPWR=1\r",function(err,res) {
				if (err) {

				}
			});
		}
		
		
		port.on('readable', function () {
			/* Read serial data from port */
			var data = port.read(); 
			/* Glue the seperated string together */
			dataString += data;
			
			/* Check if the string is finalized with an OK */
			if(!dataString.includes("OK"))
			{
				/* If not, return */
				return;
			}
			
			/* At this point we know there is valid data so split string*/
			var gpsData = dataString.toString('utf8').split(',');
		
					
			if(gpsData[1] != null)
			{
			gpsFix = parseInt(gpsData[1]);
			}
			
			if(gpsData[2] != null)
			{
			date = (gpsData[2].slice(0, 4) + "-" + gpsData[2].slice(4, 6) + "-" + gpsData[2].slice(6, 8));
			time = (gpsData[2].slice(8, 10) + ":" + gpsData[2].slice(10, 12) + ":" + gpsData[2].slice(12, 14));
			}
			
			if(gpsData[3] != null)
			{
			latitude = parseFloat(gpsData[3]);
			}
			
			if(gpsData[4] != null)
			{
			longitude = parseFloat(gpsData[4]);
			}
			
			if(gpsData[5] != null)
			{
			altitude = parseFloat(gpsData[5]);
			}
			
			if(gpsData[6] != null)
			{
			groundSpeed = parseFloat(gpsData[6]);
			}

			if(gpsData[14] != null)
			{
			satView = parseInt(gpsData[14]);
			}		
			
			if(gpsData[15] != null)
			{
			satUse = parseInt(gpsData[15]);
			}	
			/* Cleanup the dataSTring for new parsing */
			dataString = "";
		});
		
		
		
		node.on('close', function(done) {
		port.close();
		clearInterval(interval);
		done();
		});


	}
	

	RED.nodes.registerType("GPS",GOcontrollGPS);
			
}