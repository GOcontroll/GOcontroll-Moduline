module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	
	const shell = require('shelljs');	
	const fs = require('fs');

	var node = this;

	const ovpnstart = config.ovpnstart;
	
	Settings_OpenVpn ();
	Settings_ShowVersionInformation ();
	
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

		done();
		});
			
    }
	

	RED.nodes.registerType("Settings",GOcontrollSettings);
}
