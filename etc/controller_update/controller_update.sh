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

rm ./usr/moduline/bash/go-bluetooth-start.sh

rm ./usr/moduline/python/rfcommServerConfig.py

cp -r -v --force --backup ./ / >> "$FILE"

cp -r -v --force --backup ./version.txt /root/ >> "$FILE"

echo -e "${YELLOW}-Apply controller specific changes ${NORMAL}"

hw=$(tr -d '\0' </sys/firmware/devicetree/base/hardware)
case $hw in
	*IV*)
		sed -i "s/controllerType/0/g" /lib/systemd/system/go-auto-shutdown.service
		;;
	*Mini*)
		sed -i "s/controllerType/1/g" /lib/systemd/system/go-auto-shutdown.service
		echo -e "${YELLOW}-Apply patches for Moduline Mini ${NORMAL}"
		patch /usr/node-red-gocontroll/nodes/bridge_module.html /patch/bridge_module_html.patch > /dev/null
		patch /usr/node-red-gocontroll/nodes/output_module.html /patch/output_module_html.patch > /dev/null
		patch /usr/node-red-gocontroll/nodes/input_module_reset.html /patch/input_module_reset_html.patch > /dev/null
		patch /usr/node-red-gocontroll/nodes/input_module.html /patch/input_module_html.patch > /dev/null
		patch /usr/node-red-gocontroll/nodes/can_receive.html /patch/can_receive_html.patch > /dev/null
		patch /usr/node-red-gocontroll/nodes/can_send.html /patch/can_send_html.patch > /dev/null
		;;
	*Display*)
		sed -i "s/controllerType/2/g" /lib/systemd/system/go-auto-shutdown.service
		sed -i "s/WWAN_SETTINGS=True/WWAN_SETTINGS=False/g" /usr/moduline/python/rfcommServerConfig.py
esac

echo 'files moved and registered backup for rollback'

chmod 555 /usr/moduline/bash/go-simulink.sh
chmod 555 /usr/moduline/bash/go-wwan-start.sh
chmod 555 /usr/moduline/bash/go-wwan-stop.sh
chmod 555 /usr/moduline/python/identify.py
chmod 555 /usr/local/bin/qmi-network-raw
chmod 555 /usr/moduline/bash/go-bluetooth-start.sh
chmod 555 /usr/moduline/nodejs/flash-led.js
chmod 555 /usr/moduline/python/testLeds.py

cd

if [ ! -f "/etc/NetworkManager/system-connections/GO-cellular.nmconnection" ]
then
	nmcli con delete GO-celular
	nmcli con add type gsm ifname 'cdc-wdm0' con-name 'GO-cellular' apn 'super' connection.autoconnect yes gsm.pin 0000 connection.autoconnect-retries 0
fi

nmcli con mod GO-cellular connection.autoconnect-retries 0

if [ -f "/usr/node-red-gocontroll/package.json" ]
then
	cd /root/.node-red
	npm install @gocontroll-nl/node-red-gocontroll
	npm uninstall node-red-gocontroll
	npm audit fix
	rm -rf /usr/node-red-gocontroll/
	cd
fi

cd

pip3 list | grep -F pyuio || pip3 install pyuio

pip3 install -U pyuio

sync

python3 /etc/controller_update/controller_update.py