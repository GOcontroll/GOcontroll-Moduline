var fs = require('fs'),
  ledRootPath = '/sys/class/leds/';

function Led(name) {
  if (!(this instanceof Led)) {
    return new Led(name);
  }

  this.name = name;
}

module.exports = Led;

/*
 * High-level API
 */

Led.prototype.on = function() {
  this.trigger('none');
  this.brightness(255);
}

Led.prototype.off = function() {
  this.trigger('none');
  this.brightness(0);
}

Led.prototype.heartbeat = function() {
  this.trigger('heartbeat');
}

Led.prototype.blink = function(delayOn, delayOff) {
  this.trigger('timer');
  this.delayOn(delayOn);
  this.delayOff(delayOff);
}

/*
 * Low-level API
 */

Led.prototype.brightness = function(val) { // always available.
  return this.writeFile('brightness', val);
};

//Led.prototype.maxBrightness = function() { // always available, read only.
//};

Led.prototype.activate = function() { // transient
  return this.writeFile('activate', val);
};


Led.prototype.delayOff = function(val) { // timer, oneshot
  return this.writeFile('delay_off', val);
};

Led.prototype.delayOn = function(val) { // timer, oneshot
  return this.writeFile('delay_on', val);
};

Led.prototype.duration = function() { // transient
  return this.writeFile('duration', val);
};

Led.prototype.desiredBrightness = function() { // gpio
  return this.writeFile('desired_brightness', val);
};

Led.prototype.gpio = function() { // gpio
  return this.writeFile('gpio', val);
};

Led.prototype.invert = function() { // oneshot
};

Led.prototype.inverted = function() { // backlight, gpio
  return this.writeFile('inverted', val);
};

Led.prototype.shot = function() { // oneshot, write only!
  return this.writeFile('shot', val);
};

Led.prototype.state = function() { // transient
  return this.writeFile('state', val);
};

Led.prototype.trigger = function(val) { // optional!
  return this.writeFile('trigger', val);
};

// private
Led.prototype.writeFile = function(fileName, val) {
  return fs.writeFileSync(ledRootPath + this.name + '/' + fileName, val);
};

