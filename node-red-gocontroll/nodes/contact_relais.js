module.exports = function(RED) {
    "use strict"

	function GOcontrollContactRelais(config) {
	   RED.nodes.createNode(this,config);
	 
	var Relais = require('led');
	const relais = new Relais("Relais");
	
	this.on('input', function(msg) {

			if(msg.payload == 'on' || msg.payload == 1)
			{
			relais.on();
			}
			else
			{
			relais.off();
			}
        });
    }
	RED.nodes.registerType("Contact-Relais",GOcontrollContactRelais);
}
