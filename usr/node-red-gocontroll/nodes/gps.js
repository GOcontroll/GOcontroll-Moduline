module.exports = function(RED) {
    "use strict"

	const SerialPort = require("serialport");
	/* fs is needed to set GPIO LED but that is not used now */
	//const fs = require('fs');

	function GOcontrollGPS(config) { 	 
	   RED.nodes.createNode(this,config);

		/* Serial port used for simcom on Moduline 4 */
		const port = new SerialPort("/dev/ttymxc1", { baudRate: 115200 , autoOpen: false })

		var interval = null;
		var modulePowered = false;
		var startGpsSessionTimeout;
		
		/* Define data containers */
		var dataString = "";

		var node = this;
		const sampleTime = 1000;

		/* Open serial port to control GPS modem */
		port.open(function (err) {
			if (err) {
			
			}
		});
		
		GpsModule_SwitchOnModulePower();
		
		/***************************************************************************************
		** \brief	Switch on LDO that power the SIMCOM7600G module
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function GpsModule_SwitchOnModulePower (){
			/* Set GPIO pin high TODO is this really necessary??? */ 
			//fs.writeFileSync('/sys/devices/platform/leds/leds/ldo-sim7000/brightness','255');
			/* Give module some time before sending the first AT commands */ 
			startGpsSessionTimeout = setTimeout(GpsModule_StartGpsSession, 1000);
		}
		
		
		/***************************************************************************************
		** \brief	Start the GPS session onboard of the SIM7600G module
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/		
		async function GpsModule_StartGpsSession (){
		
			/* Send first AT commands for Baudrate synchronisation */
			port.write("AT\r",function(err,res) {
				if (err) {

				}
			});
			
			/* Short pauze */
			 await sleep(500);
			
			/* Send second AT commands for Baudrate synchronisation */
			port.write("AT\r",function(err,res) {
				if (err) {

				}
			});
			
			/* Short pauze */
			 await sleep(500);
			
			/* Start the GPS session on the module */
			port.write("AT+CGPS=1\r",function(err,res) {
				if (err) {

				}
			});
				
			/* Start interval to get GPS data */
			if(modulePowered === false)
			{
			setTimeout(GpsModule_StartGpsSession, 1000);
			}
			else
			{
			interval = setInterval(GpsModule_GetData, sampleTime);
			}
		}
		

		
		/***************************************************************************************
		** \brief	Utillity function fo A-Sync sleep.
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function sleep(ms) {
		  return new Promise((resolve) => {
			setTimeout(resolve, ms);
		  });
		}


		/***************************************************************************************
		** \brief	Incoming msg property
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('input', function(msg) {

		});
	
	
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		var msgOut={};
		function GpsModule_GetData(){
			
			port.write("AT+CGPSINFO\r",function(err,res) {
				if (err) {
				var errmsg = err.toString().replace("Serialport","Serialport "+node.port.serial.path);
				node.error(errmsg,msg);
				}
				
			});	
		}
		

		/***************************************************************************************
		** \brief when data is arriving onto the bus. 
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		port.on('readable', function () {
			/* Read serial data from port */
			var data = port.read(); 
			/* Glue the seperated string together */
			dataString += data;
			
			var msgOut = {};

			/* Check if the string is finalized with an OK */
			if(!dataString.includes("OK"))
			{
				/* in case it is during startup, it means the AT commands are responsive */
				modulePowered = true;
				/* If not, return */
				return;
			}
			
			/* At this point we know there is valid data so split string*/
			var validData = dataString.substring(dataString.indexOf(":") + 2);
			
			var gpsData = validData.split(',');

			var latitude;
			var longitude;
			var altitude;
			var speed;


			if(gpsData[0] != null)
			{
			latitude = parseInt(gpsData[0].slice(0, 2))
			latitude +=(parseFloat(gpsData[0].slice(2,(gpsData[0].length)-1)))/60;
			}

			if(gpsData[2] != null)
			{
			longitude = parseInt(gpsData[2].slice(0, 3))
			longitude +=(parseFloat(gpsData[2].slice(3, (gpsData[2].length)-1)))/60;
			}

			if(gpsData[6] != null)
			{
			altitude = parseFloat(gpsData[6]);
			}

			if(gpsData[7] != null)
			{
			speed = parseFloat(gpsData[7])*1.852;
			}
			
			
			
			msgOut["latitude"] = latitude;
			msgOut["longitude"] = longitude;
			msgOut["altitude"] = altitude;
			msgOut["speed"] = speed;
			
			/* Cleanup the dataSTring for new parsing */
			dataString = "";
			
			node.send(msgOut);
		});
		
		
				
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('close', function(done) {
		port.close();
		clearInterval(interval);
		clearTimeout(startGpsSessionTimeout);
		done();
		});


	}
	

	RED.nodes.registerType("GPS",GOcontrollGPS);
			
}