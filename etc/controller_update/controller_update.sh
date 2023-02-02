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

cd /usr/node-red-gocontroll/
npm list | grep uiojs || npm install uiojs --no-shrinkwrap

cd

pip3 list | grep -F pyuio || pip3 install pyuio

sync

python3 /etc/controller_update/controller_update.py