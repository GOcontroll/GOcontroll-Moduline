const fs = require('fs');

fs.readFile('/usr/moduline/information/deviceid', 'utf8' , (err, id) => {
  if (err) {
    console.error(err)
    return
  }

	module.exports = {
	DevId: process.env.DEVID = id
	};
})

fs.readFile('/usr/moduline/information/mqttserver', 'utf8' , (err, server) => {
  if (err) {
    console.error(err)
    return
  }

	module.exports = {
	MqttServer: process.env.MQTTSERVER = server
	};
})

fs.readFile('/usr/moduline/information/mqttport', 'utf8' , (err, port) => {
  if (err) {
    console.error(err)
    return
  }

	module.exports = {
	MqttPort: process.env.MQTTPORT = port
	};
})


