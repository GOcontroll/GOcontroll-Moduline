** Several commands that can be used in the command line using e.g. PuTTY

*** General
# systemctl commands:
* systemctl start xx  -- Directly start a service
* systemctl start xx  -- Directly stop a service
* systemctl enable xx  -- Start a service during boot
* systemctl disable xx  -- Disable starting a service during boot


*** GOcontroll commands
# Run Simulink model that is uploaded to /usr/simulink 
systemctl start go-simulink

# Start LTE modem and connect with 3/4G
systemctl go-wwan

# module related scripts
python3 /usr/moduline/python/installModuleFirmware.py -- scan the module slots and update any outdate modules
node /usr/moduline/nodejs/module-info-gathering.js -- scan the module slots
node /usr/moduline/nodjs/upload-new-module-firmware <slot> <firmware.srec> -- upload specific firmware to a module

*** System services
# Service to start Node-RED
systemctl start nodered



*** Other handy commands
# Check available space on the controller:
df -h

# Check status of network interfaces
ip a

# Show CAN messages on e.g. can0 interface
candump can0

# Create log from CAN message 
candump -l can0
 
 