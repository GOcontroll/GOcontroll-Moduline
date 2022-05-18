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

cd

python3 /etc/controller_update/controller_update.py