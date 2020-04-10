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
	
	const shutdown = config.shutdown;
	const ssid = config.ssid;
	const pass = config.pass;
	const speedc1 = config.speedc1;
	const speedc2 = config.speedc2;
	const speedc3 = config.speedc3;
	const speedc4 = config.speedc4;
	const simcom = config.gps4g;
	const simulinkstart = parseInt(config.simulinkstart);
	const simulinkstop = parseInt(config.simulinkstop);
	const ovpnstart = config.ovpnstart;
	
	//const simulink-restart = parseInt(config.simulink-restart); // future music
	
	//const sim7000 = new supplyControl("SIM7000-supply");

	Settings_Shutdown();
	Settings_Hostapd ();
	Settings_Interfaces ();
	Settings_Simcom ();
	Settings_OpenVpn ();
	Settings_ShowVersionInformation ();
	
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
	Settings_StopSimulinkModel();
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
	Settings_DeactivateModel();
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
		
		
		if(req.files.elfFile)
		{
			var fileExtension = (req.files.elfFile.name).split('.')
			
			if(fileExtension[1] != "elf")
			{
			node.warn("Wrong file extension detected")
			return;
			}
			
			/* The input attribute name needs to have the same value as sampleFile! */
			let elfFile = req.files.elfFile;

			/* Check if folder already exists. If not, create one */
			if (!fs.existsSync('/usr/simulink')){
			fs.mkdirSync('/usr/simulink');
			}

			/* The MV stores the incomming file to the server */ 
			elfFile.mv('/usr/simulink/gocontroll_new.elf', function(err) {
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
		}
		if(req.files.ovpnFile)
		{
			var fileExtension = (req.files.ovpnFile.name).split('.')
			
			if(fileExtension[1] != "ovpn")
			{
			node.warn("Wrong file extension detected")
			return;
			}
		
			/* The input attribute name needs to have the same value as sampleFile! */
			let ovpnFile = req.files.ovpnFile;
			
			/* Check if folder already exists. If not, create one */
			if (!fs.existsSync('/etc/openvpn')){
			fs.mkdirSync('/etc/openvpn');
			}
			
			/* The MV stores the incomming file to the server */ 
			ovpnFile.mv('/etc/openvpn/moduline.conf', function(err) {
			if (err) return res.status(500).send(err);
			res.send('File uploaded! You can now close this tab/window.');
			
			if(ovpnstart == "1")	
			{
			shell.exec('systemctl restart openvpn.service');	
			}
		
		});
		}
		
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
	function Settings_ShowVersionInformation (){
		var packageFile = fs.readFileSync("/usr/node-red-gocontroll/package.json")
		var jsonContent = JSON.parse(packageFile);
		node.status({fill:"green",shape:"dot",text:"GOcontroll SW version: "+jsonContent.version});
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
	function Settings_Shutdown (){
		
		if(!shutdown){
		shutdown = "3";
		}
		
		fs.readFile('/usr/moduline/poweroff.timeout', 'utf8', function (err,data) {

			fs.writeFile('/usr/moduline/poweroff.timeout', shutdown, 'utf8', function (err) {
					if (err) throw err;

					node.warn('Power off timeout saved');
				});
		});
		
		shell.exec('systemctl restart gocontroll.service');
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
		const can2 = new RegExp('^.*#can2.*$', 'gm');
		const can3 = new RegExp('^.*#can3.*$', 'gm');

			
		var canFormatted = 	data.replace(can0, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc1 + ' triple-sampling on loopback off #can0')
								.replace(can1, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc2 + ' triple-sampling on loopback off #can1')
								.replace(can2, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc3 + ' triple-sampling on loopback off #can2')
								.replace(can3, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc4 + ' triple-sampling on loopback off #can3');
		
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
	function Settings_Simcom (){
		if(simcom == "0")
		{
		shell.exec('systemctl disable simcom.service');
		shell.exec('systemctl stop simcom.service');
		}
		else if(simcom == "1")	
		{
		shell.exec('systemctl enable simcom.service');
		shell.exec('systemctl start simcom.service');	
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
	function Settings_OpenVpn (){
		if(ovpnstart == "0")
		{
		shell.exec('systemctl disable openvpn.service');
		shell.exec('systemctl stop openvpn.service');
		}
		else if(ovpnstart == "1")	
		{
		shell.exec('systemctl enable openvpn.service');
		shell.exec('systemctl start openvpn.service');	
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
			/* In case te model needs to stop when node red stops */ 
			if(simulinkstop == 1)
			{
			Settings_StopSimulinkModel();	
			}
		done();
		});
			
    }
	

	RED.nodes.registerType("Settings",GOcontrollSettings);
}
