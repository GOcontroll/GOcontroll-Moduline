module.exports = function(RED) {
    "use strict"

	function GOcontrollSimulinkOut(config) {
	   RED.nodes.createNode(this,config);


	const fs = require('fs');

	var node = this;
	const pipe 			= config.pipe;

	const fd = fs.openSync('/tmp/'+ pipe, 'r+');
	const stream = fs.createReadStream(null, {fd});
		
	var interval;


	if(pipe != "")
	{
	SimulinkInterface_GetDataFromPipe();	
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
	//https://github.com/nodejs/help/issues/717
			
	function SimulinkInterface_GetDataFromPipe (){	
		stream.on('data', (data) => {

			node.send(JSON.parse(data));
		  //node.warn('got from pipe: ' + data.toString())

		  if (data.toString().trim() === '[stdin end]') {
			return process.nextTick(() => {
			console.log(process.argv.slice(2));
			})
		  }
		  process.argv.push(data.toString());
		});
	}

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
	node.on('close', function(done) {
	//clearInterval(interval);
	stream.close();
	done();
	});
		
		
    }
	RED.nodes.registerType("Simulink-Out",GOcontrollSimulinkOut);
}
