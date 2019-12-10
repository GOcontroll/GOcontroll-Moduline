/**
 * Pulses my:red:led from fully off to fully on twice a second. This program
 * can suffer from visible flickering issues when the CPU is under heavy load.
 */
var Led = require('../led'),
  led = new Led('my:red:led'),
  delayOn = 0,
  delayOff = 10,
  delta = 1;

led.blink(delayOn, delayOff);

setInterval(function () {
  delayOn += delta;
  delayOff -= delta;

  led.delayOn(delayOn);
  led.delayOff(delayOff);

  if (delayOn === 10) {
    delta = -1;
  } else if (delayOn === 0) {
    delta = 1;
  }
}, 25);

