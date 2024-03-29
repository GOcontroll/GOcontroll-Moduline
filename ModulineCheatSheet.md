# Several commands that can be used in the command line using e.g. PuTTY

"" indicates fields that need to be entered by the user


# General
## systemctl commands:
* systemctl start xx  -- Directly start a service
* systemctl stop xx  -- Directly stop a service
* systemctl enable xx  -- Start a service during boot
* systemctl disable xx  -- Disable starting a service during boot
* systemctl status xx -- Look at the status of a service
* systemctl is-active xx -- Check whether a service is active or not



# GOcontroll commands
### help/testing commands
identify "-v" -- (points to identify.py) gives information about the controller and makes LED's flash, add -v for more detailed information about the modules

go-test-can -- (points to testcan.js) if a can test plug is attached to the controller this can be called to test if the can busses are functioning correctly

go-test-leds -- (points to testLeds.py) if a controller has status leds this function can be called to check if all the leds are working correctly

go-parse-a2l -- (points to parse_a2l.py) parses a /usr/simulink/gocontroll.a2l to a json string, this can then be used by other applications. \
Normally this gets called automatically by upload-server.js, but can also be called manually in case the server was not used to transfer the file

### controller update
go-manual-update -- (points to manual_update.py) updates the controller from the command line, gives the option for a development or stable update.

Accessing the linux image and dtb's can be done by mounting the boot partition like so: mount /dev/mmcblk0p1 /boot

### module related scripts
go-update-modules -- (points to installModuleFirmware.py) scan the module slots and update any outdated module firmwares

go-scan-modules -- (points to module-info-gathering.js) scan the module slots

go-overwrite-module "slot" "firmware.srec" "force update (1 for yes, empty or other for no)" -- (points to upload-new-module-firmware.js) upload specific firmware to a module

## System services
### Service to start Node-RED
systemctl start nodered

### Run Simulink model that is uploaded to /usr/simulink
systemctl start go-simulink

### Start LTE modem and connect with 3/4G
systemctl start go-wwan

### Start Bluetooth service (if present)
systemctl start go-bluetooth

### go-auto-shutdown service
systemctl start go-auto-shutdown

## Other handy commands
### Check available space on the controller:
df -h

### Check status of network interfaces
ip a

### Show CAN messages on e.g. can0 interface
candump can0

### Create log from CAN message
candump -l can0

### Check CAN bus load

canbusload can"num"@"baudrate" ... -- Add other can busses at the end to monitor them at the same time

example: canbusload can0@250000 can1@250000

### Network manager
nmcli con           -- Show list of connections and their statusses

nmcli con show "con" -- See detailed information about a specific connection

nmcli dev wifi      -- Show available Wi-Fi networks

nmcli dev wifi connect "net name" password "password" -- Connect to a wifi network with the given name and password

nmcli con mod "con" ipv4.route-metric # -- used to set network priority lowest number is highest priority, needs to be higher than 0 when using

### modem manager
mmcli --list-modems -- Show the list of modems to get the modem number

mmcli -K --modem="modemnumber"  -- Show the details of this modem

### display strings as qr codes in the terminal
qrencode -t ansiutf8 "string" or qrencode -t ansiutf8 < /path/to/file

### mount the boot partition to update a kernel image or dtb
mount /dev/mmcblk0p1 /path/to/mount
