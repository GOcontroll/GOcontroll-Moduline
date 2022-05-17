#!/bin/sh


hciattach /dev/ttymxc0 bcm43xx 921600 flow

bluetoothctl power on

python3 /usr/moduline/python/makeAgent.py &

python3 /usr/moduline/python/initLed.py &

python3 /usr/moduline/python/rfcommServer.py &


