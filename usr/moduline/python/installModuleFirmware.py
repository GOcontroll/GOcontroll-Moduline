import subprocess
from multiprocessing import Pool
import glob

OKGREEN = '\033[92m'
FAIL = '\033[91m'
ENDC = '\033[0m'

#function to upload a certain firmware to a certain slot
def upload_firmware(args):
	slot = args[0]
	new_firmware = args[1]
	stdout = subprocess.run(["node", "/usr/moduline/nodejs/upload-new-module-firmware.js", str(slot), new_firmware], stdout=subprocess.PIPE, text=True)
	return [str(slot), stdout.stdout]

#check if simulink or nodered is running and stop them.
simulink_status = subprocess.run(["systemctl", "is-active", "go-simulink"], stdout=subprocess.PIPE, text=True)
nodered_status = subprocess.run(["systemctl", "is-active", "nodered"], stdout=subprocess.PIPE, text=True)
simulink_status = simulink_status.stdout
nodered_status = nodered_status.stdout
subprocess.run(["systemctl", "stop", "go-simulink"])
subprocess.run(["systemctl", "stop", "nodered"])

#gather the current controller module configuration
subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering.js"])	

#get the configuration from the resulting file
with open("/usr/module-firmware/modules.txt", "r") as modules:
    info = modules.readline()

#get the newest available firmwares on the controller into an array
available_firmwares = glob.glob("/usr/module-firmware/" + "*.srec")
newest_firmwares = []
hw_versions = []
for firmware in available_firmwares:
    hw_version = firmware.split("/")[-1]
    hw_versions.append("-".join(hw_version.split("-")[0:4]))
for hw_version in hw_versions:
    firmwares_per_hw = glob.glob("/usr/module-firmware/" + hw_version + "*.srec")
    if len(firmwares_per_hw)>1:
        firmwares_per_hw.sort()
        newest_firmwares.append(firmwares_per_hw[-1])
    else:
        newest_firmwares.append(firmwares_per_hw[0])
#get rid of duplicates that come into existence because of the filtering
newest_firmwares = list(dict.fromkeys(newest_firmwares))

#make a list of arguments for the upload function [[slot,firmware],[slot,firmware],...]
modules_to_update = []
error_array = []
modules = info.split(":")
for i,module in enumerate(modules):
    if len(module) >0:
        split = module.split("-")
        current_software = "-".join(split[-3:])
        mod_type = "-".join(split[0:4])
        for firmware in newest_firmwares:
            if mod_type in firmware:
                if current_software not in firmware:
                    modules_to_update.append([str(i+1),firmware.split("/")[-1]])

#run a pool of processes to asynchronously upload all the firmwares
if len(modules_to_update) > 0:
    with Pool() as p:
        results = p.map(upload_firmware, modules_to_update)
    for result in results:
        if "error" in result[1]:
            error_array.append(":".join(result))

#give feedback on the result of firmware upload process
if len(error_array) > 0:
    print(f"{FAIL}Errors:{ENDC}")
    print(f"{FAIL}{error_array}{ENDC}")
else:
    print(f"{OKGREEN}Module firmware succesfully uploaded:\n{modules_to_update}{ENDC}")

#restart simulink or nodered if they were turned on before the script
if not "in" in simulink_status:
    subprocess.run(["systemctl", "start", "go-simulink"])
if not "in" in nodered_status:
    subprocess.run(["systemctl", "start", "nodered"])
