var Led = require('../led'),
  led = new Led('led0');

led.on();

setTimeout(function () {
  led.off();
}, 1000);

