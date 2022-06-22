#!/bin/sh
FILE=/etc/controller_update/backed-up-files.txt

cd

if test -f "$FILE"; then
    while read line; do
        rm "$line"
    done < $FILE
fi

cd /tmp/Rick-GO-GOcontroll*

cp -r -v --force --backup ./ / > "$FILE"

echo 'files moved registering backup'

chmod 555 /usr/moduline/bash/go-simulink.sh
chmod 555 /usr/moduline/bash/go-wwan-start.sh
chmod 555 /usr/moduline/bash/go-wwan-stop.sh
chmod 555 /usr/moduline/bash/go-gps-start.sh
chmod 555 /usr/moduline/bash/go-gps-stop.sh
chmod 555 /usr/local/bin/qmi-network-raw
chmod 555 /usr/moduline/bash/go-bluetooth-start.sh
chmod 555 /usr/moduline/nodejs/upload_server.js

cd

python3 /etc/controller_update/controller_update.py