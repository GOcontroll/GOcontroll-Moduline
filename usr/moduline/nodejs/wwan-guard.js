var shell = require('shelljs');	

var firstTimeInternet = false;
var failureCounter = 0;
	
let dns = require('dns')

/* Set interval to one minute */
var interval = setInterval(isInternetOnline , 60000);

/***************************************************************************************
** \brief
**
**
** \param
** \param
** \return
**
****************************************************************************************/
function isInternetOnline() {
		
var exec = require('child_process').exec, child;
	child = exec('ping -c 1 8.8.8.8', function(error, stdout, stderr){
		if(error !== null)
		{
			console.log("Not available")
			/* At this point, there is no internet */
			if(firstTimeInternet == true && failureCounter > 3)
			{
				/* Only re-establish connection when there was one time internet
				Restart after 3 failed pings */
				console.log("Re-establish Internet connection");
				shell.exec('systemctl restart ModemManager');
				firstTimeInternet = false;
				return;
			}
			/* If connection doesn't come up after 30 minutes */
			if(firstTimeInternet == false && failureCounter == 30)
			{
				console.log("Restart the modem and connection");
				shell.exec('systemctl restart go-wwan');
			}
			
			/* If connection doesn't come up after 60 minutes */
			if(firstTimeInternet == false && failureCounter == 60)
			{
				console.log("Reboot the controller");
				shell.exec('reboot');
			}
			
			failureCounter ++;
		}			
		else
		{
			console.log("Available")
			firstTimeInternet = true;
			failureCounter = 0;
		}
		console.log("Ping check: " + failureCounter);
	});			
}
	
process.on('SIGTERM', () => {
	clearInterval(interval);
});
