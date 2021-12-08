#!/bin/sh

# This script is tested with: 
# - SIM7600 PCIe -> Standard LTE
# - QUECTEL EC25-E PCIe -> Standard LTE
# - SIM7000 PCIe -> LTE after commands AT+CMNB=1 and AT+CNMP=38
#


# Start with powering the module
echo 255 > /sys/devices/platform/leds/leds/ldo-sim7000/brightness
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
