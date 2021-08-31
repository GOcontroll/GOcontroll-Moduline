#!/bin/sh

# Start with powering the module
echo 255 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness

# WANN functionality is claiming the supply so set propertie
filename=/usr/moduline/moduline.properties
thekey="GO_GPS"
newvalue="ACTIVE"

if ! grep -R "^[#]*\s*${thekey}=.*" $filename > /dev/null; then
  echo "$thekey=$newvalue" >> $filename
else
  sed -ir "s/^[#]*\s*${thekey}=.*/$thekey=$newvalue/" $filename
fi

# Wait two seconds to get active
sleep 2
# Set serial port to 115200 baudrate 
stty 115200 < /dev/ttymxc1
# Send AT command for synchronisation
echo -ne 'AT\r' > /dev/ttymxc1
# Wait one second
sleep 1
# Send second AT command for synchronisation
echo -ne 'AT\r' > /dev/ttymxc1
# Wait one second
sleep 1 
# Switch on the GPS power of the module
echo -ne 'AT+CGNSPWR=1\r' > /dev/ttymxc1

