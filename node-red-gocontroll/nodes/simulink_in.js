module.exports = function(RED) {
    "use strict"

	function GOcontrollSimulinkIn(config) {
	   RED.nodes.createNode(this,config);

		var fs 		= require('fs');

		var node 		= this;

		const pipe 		= config.pipe;
		const signals 	= config.signals;
		const interval 	= parseInt(config.interval,10);
		
		var intervalSendData;
		
		var key = {};
		key[0] = config.key1;
		key[1] = config.key2;
		key[2] = config.key3;
		key[3] = config.key4;
		key[4] = config.key5;
		key[5] = config.key6;
		key[6] = config.key7;
		key[7] = config.key8;

		var value = {};
		value[0] = 0;
		value[1] = 0;
		value[2] = 0;
		value[3] = 0;
		value[4] = 0;
		value[5] = 0;
		value[6] = 0;
		value[7] = 0;
		
		var writeStream = {};

		//https://github.com/nodejs/help/issues/719	
		
			
		intervalSendData = setInterval(SimulinkIn_SendData,interval);

		// start flag to  start from 0
		// flags wx prevent createWriteStream from crashing
		var stream;// = fs.createWriteStream('/tmp/'+pipe,{start: 0, flags: 'w+'});	

		//SimulinkIn_SendData();

		/***************************************************************************************
		** \brief	Function that received data from the pipe (stream call back)
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		function SimulinkIn_SendData(){
			/* Load the values in the stream object */
			for(var s =0; s <signals; s++)
			{
				writeStream[key[s]] = value[s];
			}
			/* Create stream, write to is and close it. If it isn't closed each time, the file will grow */
			stream = fs.createWriteStream('/tmp/'+pipe,{start: 0, flags: 'w+'});
			stream.write(JSON.stringify(writeStream));
			stream.close();

			/* On error, stop the interval on which data is written to Simulink */
			stream.on('error', function(err) {
			clearInterval(intervalSendData)	
			node.warn("Possible conflict with pipe names. Check the names in Simulink and Node-RED");
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
			for(var s =0; s <signals; s++)
			{
				/* Check if key is available in incoming message */
			   if(msg.hasOwnProperty(key[s]))
			   {
				value[s] = msg[key[s]];
			   }				   	
			}
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
		clearInterval(intervalSendData)
		
			/* Delete pipe if node is deleted */
			fs.unlink('/tmp/'+pipe, function (err) {
				if (err) throw err;
			//	console.log('Pipe to Simulink deleted');
			});

		done();
		});
    }
	RED.nodes.registerType("Simulink-In",GOcontrollSimulinkIn);
}
