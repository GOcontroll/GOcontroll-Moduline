#!/bin/sh
FILE=/etc/controller_update/backed-up-files.txt

cd

if test -f "$FILE"; then
    while read line; do
        rm "$line"
    done < $FILE
fi

cd /tmp/GOcontroll-*

cp -r -v --force --backup ./etc/controller_update/ /etc/ > "$FILE"

rm -r ./etc/

cp -r -v --force --backup ./ / >> "$FILE"

echo 'files moved registering backup'

chmod 555 /usr/moduline/bash/go-simulink.sh
chmod 555 /usr/moduline/bash/go-wwan-start.sh
chmod 555 /usr/moduline/bash/go-wwan-stop.sh
chmod 555 /usr/moduline/python/identify.py
chmod 555 /usr/local/bin/qmi-network-raw
chmod 555 /usr/moduline/bash/go-bluetooth-start.sh
chmod 555 /usr/moduline/nodejs/upload-server.js
chmod 555 /usr/moduline/nodejs/flash-led.js
chmod 555 /usr/moduline/python/testLeds.py

cd

if [[ $(tr -d '\0' < /sys/firmware/devicetree/base/hardware) == "Moduline Mini"* ]]; then

echo -e "${YELLOW}-Apply patches for Moduline Mini ${NORMAL}"
patch /usr/node-red-gocontroll/nodes/bridge_module.html /patch/bridge_module_html.patch > /dev/null
patch /usr/node-red-gocontroll/nodes/output_module.html /patch/output_module_html.patch > /dev/null
patch /usr/node-red-gocontroll/nodes/input_module_reset.html /patch/input_module_reset_html.patch > /dev/null
patch /usr/node-red-gocontroll/nodes/input_module.html /patch/input_module_html.patch > /dev/null
patch /usr/node-red-gocontroll/nodes/can_receive.html /patch/can_receive_html.patch > /dev/null
patch /usr/node-red-gocontroll/nodes/can_send.html /patch/can_send_html.patch > /dev/null
fi

echo -e "${YELLOW}-Set up aliasses for go-scripts ${NORMAL}"
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-reset-ap"* ]]; then
	echo "alias go-reset-ap=\"/usr/moduline/bash/reset-ap.sh\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-update-modules"* ]]; then
	echo "alias go-update-modules=\"python3 /usr/moduline/python/installModuleFirmware.py\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-scan-modules"* ]]; then
	echo "alias go-scan-modules=\"node /usr/moduline/nodejs/module-info-gathering.js\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-overwrite-module"* ]]; then
	echo "alias go-overwrite-module=\"node /usr/moduline/nodejs/upload-new-module-firmware.js\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-manual-update"* ]]; then
	echo "alias go-manual-update=\"python3 /etc/controller_update/manual_update.py\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-test-can"* ]]; then
	echo "alias go-test-can=\"node /usr/moduline/nodejs/testcan.js\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-parse-a2l"* ]]; then
	echo "alias go-parse-a2l=\"python3 /usr/moduline/python/parse_a2l.py\"" >> ~/.bashrc
fi
if [[ $(tr -d '\0' < ~/.bashrc) != *"go-test-leds"* ]]; then
	echo "alias go-test-leds=\"/usr/moduline/python/testLeds.py\"" >> ~/.bashrc
fi

cd /usr/node-red-gocontroll/
npm list | grep uiojs || npm install uiojs --no-shrinkwrap

cd

pip3 list | grep -F pyuio || pip3 install pyuio

sync

python3 /etc/controller_update/controller_update.py