module.exports = function(RED) {
    "use strict"

	function GOcontrollSettings(config) {
	   RED.nodes.createNode(this,config);
	 
	const fs = require('fs');
	const supplyControl = require('led');

	var node = this;
	const ssid = config.ssid;
	const pass = config.pass;
	const speedc1 = config.speedc1;
	const speedc2 = config.speedc2;
	const simSupply = config.gps4g;
	
	const sim7000 = new supplyControl("SIM7000-supply");

	Settings_Hostapd ();
	Settings_Interfaces ();
	Settings_SetSim7000Supply ();
	
	/***************************************************************************************
	** \brief
	**
	**
	** \param
	** \param
	** \return
	**
	****************************************************************************************/
	function Settings_Hostapd (){
		fs.readFile('/etc/hostapd/hostapd.conf', 'utf8', function (err,data) {

			var credentialsFormatted = 	data.replace(/^ssid=.*$/m, 'ssid='+ ssid)
											.replace(/^wpa_passphrase=.*$/m, 'wpa_passphrase='+ pass);
		
			fs.writeFile('/etc/hostapd/hostapd.conf', credentialsFormatted, 'utf8', function (err) {
				if (err) throw err;

				node.warn('WiFi credentials saved');
			});
		
		});
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
	function Settings_Interfaces (){
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
	function Settings_SetSim7000Supply (){
		if(simSupply == "0")
		{
		sim7000.off();
		}
		else if(simSupply == "1")	
		{
		sim7000.on();	
		}
	}
	
	
	this.on('input', function(msg) {
        });
		
		
    }
	RED.nodes.registerType("Settings",GOcontrollSettings);
}
