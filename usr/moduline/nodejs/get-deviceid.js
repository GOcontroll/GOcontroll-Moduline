const fs = require('fs');

fs.readFile('/usr/moduline/information/deviceid', 'utf8' , (err, id) => {
  if (err) {
    console.error(err)
    return
  }

	module.exports = {
	DeviceId: process.env.DEVICEID = id
	};
})


