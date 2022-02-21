#!/bin/sh

# This script is tested with: 
# - SIM7600 PCIe -> Standard LTE
# - QUECTEL EC25-E PCIe -> Standard LTE
# - SIM7000 PCIe -> LTE after commands AT+CMNB=1 and AT+CNMP=38
#


# Check if hardware is Moduline Mini controller. In this case, LDO and Level shifter needs to be enabled
if [[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.03" ]] ||
[[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.04" ]]||
[[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini V1.05" ]]; then
# Start with powering the module and level shifter
echo 255 > /sys/devices/platform/leds/leds/communication-ldo-active/brightness
echo 255 > /sys/devices/platform/leds/leds/sim7000-level-active/brightness
else
# Start with powering the module
echo 255 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness
fi


echo 255 > /sys/devices/platform/leds/leds/pwr-sim7000/brightness
echo 255 > /sys/devices/platform/leds/leds/rst-sim7000/brightness

# WANN functionality is claiming the supply so set propertie
filename=/usr/moduline/moduline.properties
thekey="GO_WWAN"
newvalue="ACTIVE"

if ! grep -R "^[#]*\s*${thekey}=.*" $filename > /dev/null; then
  echo "$thekey=$newvalue" >> $filename
else
  sed -ir "s/^[#]*\s*${thekey}=.*/$thekey=$newvalue/" $filename
fi

# Wait two seconds to get active
sleep 5
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
# Use Cat-M Technology instead of NB-IoT
echo -ne 'AT+CMNB=1\r' > /dev/ttymxc1
# Wait one second
sleep 1 
# Use LTE communication technology
echo -ne 'AT+CNMP=38\r' > /dev/ttymxc1

# Create connection descriptor
nmcli connection add type gsm ifname 'cdc-wdm0' con-name 'GO-celular' apn 'super' connection.autoconnect yes gsm.pin 0000

# Helpfull commands:
# Get connection status --> nmcli device status
# Get active Modem numb	--> mmcli --list-modems
# Get modem information --> mmcli --modem=0


# Modem SIMCOM 7600E
# - LTE CAT1 10 Mbps DL
# - LTE CAT1 5 Mbps UL
#
# Modem SIMCOM 7000E
# - LTE CAT1 300Kbps DL
# - LTE CAT1 375Kbps UL