#!/bin/sh

# Delete connection descriptor
nmcli connection delete GO-celular

# WANN functionality is not claiming the supply anymore so set property
filename=/usr/moduline/moduline.properties
thekey="GO_WWAN"
newvalue="NOT-ACTIVE"

if ! grep -R "^[#]*\s*${thekey}=.*" $filename > /dev/null; then
  echo "$thekey=$newvalue" >> $filename
else
  sed -ir "s/^[#]*\s*${thekey}=.*/$thekey=$newvalue/" $filename
fi

retrievedKey=$(sed -rn 's/^GO_GPS=([^\n]+)$/\1/p' /usr/moduline/moduline.properties) 

if [[ $retrievedKey == "NOT-ACTIVE" ]]
then
	# Stop with powering the module only if GPS is not using it.
	echo 0 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness
fi