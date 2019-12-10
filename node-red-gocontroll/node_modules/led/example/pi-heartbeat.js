var Led = require('../led');

['led0', 'led1'].forEach(function (name) {
  new Led(name).heartbeat();
});
