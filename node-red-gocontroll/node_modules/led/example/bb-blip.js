var Led = require('../led');

['usr0', 'usr1', 'usr2', 'usr3'].forEach(function (name) {
  new Led('beaglebone:green:' + name).blink(1, 1999);
});

