#!/bin/sh

# first be shure you're on root
cd

# be shure the binary has execution acces
chmod 555 /usr/simulink/*.elf

# start the program with niceness -20
nice -n -20 /usr/simulink/*.elf &

# restart nodered to update the cached a2l
systemctl restart nodered