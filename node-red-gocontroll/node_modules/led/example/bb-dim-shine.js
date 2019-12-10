var Led = require('../led'),
  led = new Led('my:red:led'),
  dim = true;

led.blink(1, 9);

setInterval(function () {
  if (dim) {
    led.delayOn(9);
    led.delayOff(1);
  } else {
    led.delayOn(1);
    led.delayOff(9);
  }

  dim = !dim;
}, 1000);

