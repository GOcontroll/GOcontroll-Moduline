module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	 
	 const fs = require('fs');
	//var Relais = require('led');
	//const relais = new Relais("relais");
	
	var node = this;
	this.ssid = config.ssid;
	this.pass = config.pass;
		
	this.log(node.name);
	
	
		fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {

		var formatted = data.replace(/^ssid=.*$/m, 'ssid='+ node.ssid);

		fs.writeFile('/etc/hostapd/hostapd.conf', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('The file has been saved!');
		});
		
		var formatted = data.replace(/^wpa_passphrase=.*$/m, 'wpa_passphrase='+ node.pass);

		fs.writeFile('/etc/hostapd/hostapd.conf', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('The file has been saved!');
		});
		
	});
	

	
	
	this.on('input', function(msg) {

        });
    }
	RED.nodes.registerType("Settings",GOcontrollSettings);
}
