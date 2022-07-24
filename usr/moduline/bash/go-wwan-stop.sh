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

# Check if hardware is Moduline Mini controller. In this case, LDO and Level shifter needs to be enabled
if [[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.03" ]] ||
[[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.04" ]]||
[[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.05" ]]||
[[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.06" ]]; then
# Start with powering the module and level shifter
echo 0 > /sys/devices/platform/leds/leds/communication-ldo-active/brightness
echo 0 > /sys/devices/platform/leds/leds/sim7000-level-active/brightness
else
# Start with powering the module
echo 0 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness
fi
