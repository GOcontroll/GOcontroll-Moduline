module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	 
	const fs = require('fs');

	var node = this;
	this.ssid = config.ssid;
	this.pass = config.pass;
	const speedc1 = config.speedc1;
	const speedc2 = config.speedc2;
	
	
	fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {

		var credentialsFormatted = 	data.replace(/^ssid=.*$/m, 'ssid='+ node.ssid)
										.replace(/^wpa_passphrase=.*$/m, 'wpa_passphrase='+ node.pass);
	
		fs.writeFile('/etc/hostapd/hostapd.conf', credentialsFormatted, 'utf8', function (err) {
			if (err) throw err;

			node.warn('WiFi credentials saved');
		});
	
	});
	
	
	fs.readFile('/etc/network/interfaces', 'utf8', function (err,data) {
			
	const can0 = new RegExp('^.*#can0.*$', 'gm');
	const can1 = new RegExp('^.*#can1.*$', 'gm');

		
	var canFormatted = 	data.replace(can0, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc1 + ' triple-sampling on loopback off #can0')
							.replace(can1, 'pre-up /sbin/ip link set $IFACE type can bitrate '+ speedc2 + ' triple-sampling on loopback off #can1');

	fs.writeFile('/etc/network/interfaces', canFormatted, 'utf8', function (err) {
		if (err) throw err;
		node.warn('CAN settings saved!');
		
					});
	});
		
		
	var packageFile = fs.readFileSync("/usr/node-red-gocontroll/package.json")
	
	var jsonContent = JSON.parse(packageFile);
	
	node.status({fill:"green",shape:"dot",text:"GOcontroll node version: "+jsonContent.version});

	this.on('input', function(msg) {

        });
    }
	RED.nodes.registerType("Settings",GOcontrollSettings);
}
