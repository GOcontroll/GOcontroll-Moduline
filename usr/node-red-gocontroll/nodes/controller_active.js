module.exports = function(RED) {
    "use strict"

	function GOcontrollControllerActive(config) {
	   RED.nodes.createNode(this,config);
	 
	var Active = require('led');
	const active = new Active("power-active");
	
	this.on('input', function(msg) {

			if(msg["controllerActive"] == 1)
			{
			active.on();	
			}
			else
			{
			active.off();	
			}

        });
    }
	RED.nodes.registerType("Controller-Active",GOcontrollControllerActive);
}
