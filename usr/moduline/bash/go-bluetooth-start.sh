#!/bin/sh

if [[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Screen"* ]]; then

echo -e "${YELLOW}-Setting up bluetooth for the Moduline screen ${NORMAL}"

hciattach /dev/ttymxc1 bcm43xx 921600 flow nosleep macplaceholder

else

echo -e "${YELLOW}-Setting up bluetooth for the Moduline controller ${NORMAL}"

hciattach /dev/ttymxc0 bcm43xx 921600 flow nosleep macplaceholder

fi

bluetoothctl power on

python3 /usr/moduline/python/makeAgent.py &

python3 /usr/moduline/python/rfcommServer.py &

python3 /usr/moduline/python/initLed.py 1 &
