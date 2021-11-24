module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	RED.nodes.createNode(this,config);
	
	const fs = require('fs');

	var node = this;

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
		var PackageVersion = fs.readFileSync('/root/version').toString().split(/\r?\n/);
		node.status({fill:"green",shape:"dot",text:"GOcontroll SW: "+ PackageVersion[0] });
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
