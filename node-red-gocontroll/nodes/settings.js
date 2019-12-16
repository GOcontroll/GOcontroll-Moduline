module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	 
	const fs = require('fs');
	const shell = require('shelljs');
	
	var node = this;
	this.ssid = config.ssid;
	this.pass = config.pass;
	const speedc1 = config.speedc1;
	const speedc2 = config.speedc2;
	
		
	this.log(node.name);
	
	//node.warn("Setup can0");
	/*
	shell.exec('ip link set down can0');
	shell.exec('ip link set down can1');
	
	shell.exec('ip link set can0 type can bitrate '+this.speedc1);
	shell.exec('ip link set can1 type can bitrate '+this.speedc2);
	
	shell.exec('ip link set up can0');
	shell.exec('ip link set up can1');	
	*/
	
	
	
	
	fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {

		var formatted = data.replace(/^ssid=.*$/m, 'ssid='+ node.ssid);

		fs.writeFile('/etc/hostapd/hostapd.conf', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('The file has been saved!');
		});
		
		formatted = data.replace(/^wpa_passphrase=.*$/m, 'wpa_passphrase='+ node.pass);

		fs.writeFile('/etc/hostapd/hostapd.conf', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('The file has been saved!');
		});
		
	});
	
		fs.readFile('/etc/network/interfaces', 'utf8', function (err,data) {
			
		let can0 = new RegExp('^.*#can0.*$', 'gm');
		let can1 = new RegExp('^.*#can1.*$', 'gm');
		
		var formatted = data.replace(can0, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc1 + ' triple-sampling on loopback off #can0');
		

		fs.writeFile('/etc/network/interfaces', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('CAN 1 settings saved!');
		});
		
		
		formatted = data.replace(can1, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc2 + ' triple-sampling on loopback off #can1');
		
				fs.writeFile('/etc/network/interfaces', formatted, 'utf8', function (err) {
			if (err) throw err;

			node.log('CAN 2 settings saved!');
		});
		
		
		
	});
	

	
	
	this.on('input', function(msg) {

        });
    }
	RED.nodes.registerType("Settings",GOcontrollSettings);
}
