
	var shell = require('shelljs');	
	const fs = require('fs');
	const fileUpload = require('express-fileupload');
	const express = require('express');
	
	/* Create variable for file upload */
	const app = express();
	
	/* Create a listener for file upload on specific port */
	var server = app.listen(8001);
	
	/* Activate a file upload option */
	app.use(fileUpload());
	
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
		return res.status(400).send('No files were uploaded.');
		}
		
		
		if(req.files.elfFile)
		{
			var fileExtension = (req.files.elfFile.name).split('.')
			
			if(fileExtension[1] != "elf")
			{
			res.send('Wrong file extension detected! Check your file!');
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
			
			/*Check if current model is running */
			var active = shell.exec('systemctl is-active --quiet go-simulink');
			
			/* If code is 0 it means the service is running */
			if(active.code === 0)
			{
			/* We first need to stop the current model from running */
			shell.exec('systemctl stop go-simulink.service');	
			}
			/* Now we can delete the old model and rename the new one */
			shell.exec('rm /usr/simulink/gocontroll.elf');
			/* Now we can rename the file*/
			shell.exec('mv /usr/simulink/gocontroll_new.elf /usr/simulink/gocontroll.elf');
			/* Only restart the service if the model was allready running */
			if(active.code === 0)
			{
			/* Start service */
			shell.exec('systemctl start go-simulink.service');	
			}
			
			});
		 }
		
		if(req.files.ovpnFile)
		{
			var fileExtension = (req.files.ovpnFile.name).split('.')
			
			if(fileExtension[1] != "ovpn")
			{
			res.send('Wrong file extension detected! Check your file!');
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
			
			/*Check if current service is running */
			var active = shell.exec('systemctl is-active --quiet openvpn');
			
			/* If code is 0 it means the service is running */
			if(active.code === 0)
			{
			shell.exec('systemctl restart openvpn');
			}			

		});
		}
		
	});
	
	process.on('SIGTERM', () => {
		server.close(() => {
		});
	});
