** Several commands that can be used in the command line using e.g. PuTTY

*** General
# systemctl commands:
* systemctl start xx  -- Directly start a service
* systemctl stop xx  -- Directly stop a service
* systemctl enable xx  -- Start a service during boot
* systemctl disable xx  -- Disable starting a service during boot
* systemctl status xx -- Look at the status of a service
* systemctl is-active xx -- Check whether a service is active or not



*** GOcontroll commands
# arbitrary commands
identify <-v> -- gives information about the controller and makes LED's flash, add -v for more detailed information about the modules

# module related scripts
go-update-modules (points to installModuleFirmware.py) -- scan the module slots and update any outdated module firmwares

go-scan-modules (points to module-info-gathering.js) -- scan the module slots

go-overwrite-module <slot> <firmware.srec> <force update (1 for yes, empty or other for no)> (points to upload-new-module-firmware.js) -- upload specific firmware to a module

*** System services
# Service to start Node-RED
systemctl start nodered

# Run Simulink model that is uploaded to /usr/simulink 
systemctl start go-simulink

# Start LTE modem and connect with 3/4G
systemctl start go-wwan

# Start Bluetooth service (if present)
systemctl start go-bluetooth



*** Other handy commands
# Check available space on the controller:
df -h

# Check status of network interfaces
ip a

# Show CAN messages on e.g. can0 interface
candump can0

# Create log from CAN message 
candump -l can0

# Check CAN bus load

canbusload can<num>@<baudrate> ... -- Add other can busses at the end to monitor them at the same time
 
# Network manager
nmcli con           -- Show list of connections and their statusses
 
nmcli con show <con> -- See detailed information about a specific connection
 
nmcli dev wifi      -- Show available Wi-Fi networks
 
nmcli dev wifi connect <net name> password <password> -- Connect to a wifi network with the given name and password

# modem manager
mmcli --list-modems --Show the list of modems to get the modem number
 
mmcli -K --modem=<modemnumber>  --Show the details of this modem
