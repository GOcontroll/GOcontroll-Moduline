#!/bin/sh

# first be shure you're on root
cd

# be shure the binary has execution acces 
chmod 777 /usr/simulink/gocontroll.elf

# start the program
/usr/simulink/gocontroll.elf &
