const getmac = require('getmac')

var address = getmac.default()

module.exports = {
MacAddress: process.env.MACADDRESS = address
};