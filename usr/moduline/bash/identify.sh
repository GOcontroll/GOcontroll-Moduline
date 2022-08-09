#!/bin/bash

echo -e "\n"
cat /sys/firmware/devicetree/base/hardware
echo -e "\n"
lsb_release -a
echo -e "\n"

node /usr/moduline/nodejs/flash-led.js 10 &
