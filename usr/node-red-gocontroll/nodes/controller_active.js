module.exports = function(RED) {
    "use strict"

	const fs = require('fs');

	function GOcontrollControllerActive(config) {
	   RED.nodes.createNode(this,config);
	 

	/***************************************************************************************
	** \brief	Funtion called on message injection
	**
	** \param	msg
	** \return	none
	**
	****************************************************************************************/
	this.on('input', function(msg) {

			if(msg["controllerActive"] == 1)
			{
			fs.writeFileSync('/sys/class/leds/power-active/brightness','255');
			}
			else
			{
			fs.writeFileSync('/sys/class/leds/power-active/brightness','0');	
			}

        });
    }
	RED.nodes.registerType("Controller-Active",GOcontrollControllerActive);
}
