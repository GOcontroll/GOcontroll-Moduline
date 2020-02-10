module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	
	const shell = require('shelljs');	
	const fs = require('fs');
	const supplyControl = require('led');
	const express = require('express');
	const fileUpload = require('express-fileupload');



	var node = this;
	
	const ssid = config.ssid;
	const pass = config.pass;
	const speedc1 = config.speedc1;
	const speedc2 = config.speedc2;
	const simSupply = config.gps4g;
	const simulinkstart = parseInt(config.simulinkstart);
	const simulinkstop = parseInt(config.simulinkstop);
	//const simulink-restart = parseInt(config.simulink-restart); // future music
	
	const sim7000 = new supplyControl("SIM7000-supply");

	
	Settings_Hostapd ();
	Settings_Interfaces ();
	Settings_SetSim7000Supply ();
	
	/* Create variable for file upload */
	const app = express();
	
	/* Create a listener for file upload on specific port */
	var server = app.listen(8001);
	
	/* Activate a file upload option */
	app.use(fileUpload());
	
	/* In case the model don't need to start */
	if(simulinkstart == 0)
	{
	Settings_DeactivateModel();	
	}
	
	/* In case te model needs to start at controller boot */ 
	if(simulinkstart == 1)
	{
	Settings_ActivateModel();
	Settings_StartSimulinkModel();	
	}
	
	/* In case te model needs to start after node red is started*/ 
	if(simulinkstart == 2)
	{
	Settings_StartSimulinkModel();
	}
		
	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	app.post('/upload', function(req, res) {
		
		if (!req.files || Object.keys(req.files).length === 0) {
		node.warn("no files");
		return res.status(400).send('No files were uploaded.');
		}

		/* The input attribute name needs to have the same value as sampleFile! */
		let sampleFile = req.files.sampleFile;

		/* The MV stores the incomming file to the server */ 
		sampleFile.mv('/usr/simulink/gocontroll_new.elf', function(err) {
		if (err) return res.status(500).send(err);
		res.send('File uploaded! You can now close this tab/window.');
		
		/* We first need to stop the current model from running */
		Settings_StopSimulinkModel ();
		/* Now we can delete the old model and rename the new one */
		shell.exec('rm /usr/simulink/gocontroll.elf');
		/* Now we can rename the file*/
		shell.exec('mv /usr/simulink/gocontroll_new.elf /usr/simulink/gocontroll.elf');
		/* Now start the new model if requested */
		if(simulinkstart == 2 || simulinkstart == 1 )
		{
		Settings_StartSimulinkModel();
		}
	  });
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
	app.get('/inputFile', function(req, res){
	node.warn("get function");
	res.render('inputt');
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
	function Settings_StartSimulinkModel (){
		shell.exec('systemctl start gocontroll.service');
	}
	
	
		/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_StopSimulinkModel (){
		shell.exec('systemctl stop gocontroll.service');
	}
	

		/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_ActivateModel (){
		shell.exec('systemctl enable gocontroll.service');
	}
	
	
		/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_DeactivateModel (){
		shell.exec('systemctl disable gocontroll.service');
	}
	
	
		/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_RestartSimulinkModel (){
		Settings_StopSimulinkModel();
		Settings_StartSimulinkModel();
	}

	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_Hostapd (){
		fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {

			var credentialsFormatted = 	data.replace(/^ssid=.*$/m, 'ssid='+ ssid)
											.replace(/^wpa_passphrase=.*$/m, 'wpa_passphrase='+ pass);
		
			fs.writeFile('/etc/hostapd/hostapd.conf', credentialsFormatted, 'utf8', function (err) {
				if (err) throw err;

				node.warn('WiFi credentials saved');
			});
		
		});
	}
	
	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_Interfaces (){
		fs.readFile('/etc/network/interfaces', 'utf8', function (err,data) {
				
		const can0 = new RegExp('^.*#can0.*$', 'gm');
		const can1 = new RegExp('^.*#can1.*$', 'gm');

			
		var canFormatted = 	data.replace(can0, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc1 + ' triple-sampling on loopback off #can0')
								.replace(can1, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc2 + ' triple-sampling on loopback off #can1');

		fs.writeFile('/etc/network/interfaces', canFormatted, 'utf8', function (err) {
			if (err) throw err;
			node.warn('CAN settings saved!');
			
						});
		});
	}

	
	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_SetSim7000Supply (){
		if(simSupply == "0")
		{
		sim7000.off();
		}
		else if(simSupply == "1")	
		{
		sim7000.on();	
		}
	}
	
		/***************************************************************************************
		** \brief
		**
		**
		** \param
		** \param
		** \return
		**
		****************************************************************************************/
		this.on('input', function(msg) {
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
		server.close();
		done();
		});
			
    }
	

	RED.nodes.registerType("Settings",GOcontrollSettings);
}
