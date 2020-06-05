module.exports = function(RED) {
    "use strict"

	function GOcontrollTemperature(config) {
	   RED.nodes.createNode(this,config);

		var fs 		= require('fs');

		var node 		= this;
		
		var intervalGetTemperature;
		var msgOut = {};

		intervalGetTemperature = setInterval(GetCpuTemperature,5000);

		/***************************************************************************************
		** \brief	Function that received data from the pipe (stream call back)
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function GetCpuTemperature(){
	
			/* First check if folder is present if not, create one*/
			if (!fs.existsSync('/sys/devices/virtual/thermal/thermal_zone0')) {
			return;
			}
		
			fs.readFile('/sys/devices/virtual/thermal/thermal_zone0/temp', (err, data) => {
			
			if(data != NaN)
			{
			msgOut["temperature"]= (parseInt(data))/1000;
			node.send(msgOut);
			}
			
			if (err)
			{
			/* For debugging purposes otherwise to much noise on debug window */
			//node.warn("Problem reading temperature");
			clearInterval(intervalGetTemperature);
			return;
			}
			
			});
		}


		/***************************************************************************************
		** \brief	Function that received data from the pipe (stream call back)
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
		** \brief	Function that received data from the pipe (stream call back)
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		node.on('close', function(done) {
		clearInterval(intervalGetTemperature)
		done();
		});
    }
	RED.nodes.registerType("CPU-Temperature",GOcontrollTemperature);
}
