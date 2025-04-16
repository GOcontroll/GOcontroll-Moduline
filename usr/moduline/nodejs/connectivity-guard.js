var shell = require('shelljs');
var exec = require('child_process').exec;
var fs = require('fs');

const ETH = 0;
const WLAN = 1;
const WWAN = 2;

var failureCounter = 0;
var connectiontype = WWAN;
var interval;

//delay the interface check from startup
setTimeout(() => {
	exec("ip -j a", function(error, stdout, stderr) {
		var res = JSON.parse(stdout);
		for (var ifObj in res) {
			if (res[ifObj].ifname=="eth0") {
				if (res[ifObj].operstate=="UP"){
					connectiontype = ETH;
					break;
				}
			}
			if(res[ifObj].ifname=="wlan0"){
				if (res[ifObj].addr_info[0].local!="192.168.19.85") {
					connectiontype = WLAN;
					break;
				}
			}

		}

		switch (connectiontype) {
			case ETH:
				console.log("Ethernet connection detected.");
				break;
			case WWAN:
				console.log("WWAN connection detected");
				break;
			case WLAN:
				console.log("WLAN connection detected");
				break;
		}
		/* Set interval to one minute */
		interval = setInterval(isInternetOnline , 60000);
	});
}, 600000);

function isInternetOnline()
{
	exec('ping -c 1 8.8.8.8', function(error, stdout, stderr)
	{
		if(error !== null)
		{
			console.log("Not available")
			const {stdout, stderr, code} = shell.exec("date", {silent: true})
			/* At this point, there is no internet */
			/* If connection doesn't come up after 30 minutes */
			if(failureCounter >= 20)
			{
				fs.open("/etc/netlog.txt", "a", 666, function( e, id )
				{
					fs.write( id, "rebooted at " + stdout, null, "utf8", function()
					{
						fs.close(id, function()
						{
						});
					});
				});
				shell.exec('reboot');
			}
			if(failureCounter >= 3)
			{
				/* Only re-establish connection when there was one time internet
				Restart after 3 failed pings */
				console.log("Re-establish Internet connection");
				if (connectiontype == ETH){
					if ( failureCounter & 0x01){
						shell.exec("ip link set eth0 down");
					} else {
						shell.exec('ip link set eth0 up');
					}
				} else if (connectiontype == WWAN && failureCounter & 0x01) {
					console.log("Restart the modem");
					shell.exec('systemctl restart go-wwan');
				} else if (connectiontype == WLAN) {
					if ( failureCounter & 0x01){
						shell.exec("modprobe -r brcmfmac");
					} else {
						shell.exec('modprobe brcmfmac');
					}
				}
			}
			failureCounter ++;
		}
		else
		{
			console.log("Available")
			failureCounter = 0;
		}
		console.log("Ping check: " + failureCounter);
	});
}
process.on('SIGTERM', () => {
	clearInterval(interval);
});
