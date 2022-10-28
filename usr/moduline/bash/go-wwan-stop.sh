#!/bin/sh

# Delete connection descriptor
# nmcli connection delete GO-celular

# Switch off LDO regulator
if [[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini"* ]]; then
echo 0 > /sys/devices/platform/leds/leds/sim7000-level-active/brightness
else
echo 0 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness
fi
# Get PWR and RST pin in low state
echo 0 > /sys/devices/platform/leds/leds/pwr-sim7000/brightness
echo 0 > /sys/devices/platform/leds/leds/rst-sim7000/brightness

