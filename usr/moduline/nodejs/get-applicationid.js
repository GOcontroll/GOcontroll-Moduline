const fs = require('fs');

fs.readFile('/usr/moduline/information/applicationid', 'utf8' , (err, id) => {
  if (err) {
    console.error(err)
    return
  }

	module.exports = {
	ApplicationId: process.env.APPLICATIONID = id
	};
})


