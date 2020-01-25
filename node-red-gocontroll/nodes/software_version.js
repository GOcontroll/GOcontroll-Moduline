module.exports = function(RED) {
    "use strict"

	function GOcontrollSoftware(config) {
	   RED.nodes.createNode(this,config);
	 
	const fs = require('fs');
	const shell = require('shelljs');
	
	var node = this;

	var jsonContent;

	var machineState = 0;

	var msgOut = {};
	
	var latestVersion
	
	msgOut["machineState"] = machineState;

	Settings_GetVersion ();


	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_GetVersion (){
		var packageFile = fs.readFileSync("/usr/node-red-gocontroll/package.json")
		
		jsonContent = JSON.parse(packageFile);
		node.status({fill:"green",shape:"dot",text:"Node version: "+jsonContent.version + " Click to check latest version"});
	}
	
	
	
	this.on('input', function(msg) {
			/* Request the latest version from Github */
			if(machineState == 0)
			{
			const command = '/usr/node-red-gocontroll/nodes/software_version.sh'
				
			latestVersion = shell.exec(command);
			
			var latestVersion = latestVersion.substring(1,latestVersion.length-1);
			node.warn(latestVersion);
			node.warn(jsonContent.version);
			
				if(jsonContent.version == latestVersion)
				{
				node.status({fill:"green",shape:"dot",text:"Latest version ("+jsonContent.version+") already installed"});
				machineState = 2
				}
				else
				{
				node.status({fill:"yellow",shape:"dot",text:"New version available ("+jsonContent.version+") Click to update"});
				machineState = 1	
				}
			}
			else if(machineState == 1)
			{
			const command = 'wget -O - https://raw.githubusercontent.com/Rick-GO/GOcontroll-Moduline-III/tree/'+latestVersion.substring(0,latestVersion.length-1)+'/installer/gocontroll-node-update | bash'	
				
			node.warn(command);
			/* routine to update controller */
			//shell.exec(command);
			}
		
		msgOut["machineState"] = machineState;
        });
		
		
		
			RED.httpAdmin.get("/softwareVersion", RED.auth.needsPermission('softwareVersion.read'), function(req,res) {
			res.json(msgOut);
		});
    }
	RED.nodes.registerType("Software",GOcontrollSoftware);
	
	

}
