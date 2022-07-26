import subprocess
from multiprocessing import Pool
import glob

def upload_firmware(args):
	slot = args[0]
	new_firmware = args[1]
	stdout = subprocess.run(["node", "/usr/moduline/nodejs/upload-new-module-firmware.js", str(slot), new_firmware], stdout=subprocess.PIPE, text=True)
	return [slot, stdout.stdout]

simulink_status = subprocess.run(["systemctl", "is-active", "go-simulink"], stdout=subprocess.PIPE, text=True)
nodered_status = subprocess.run(["systemctl", "is-active", "nodered"], stdout=subprocess.PIPE, text=True)
simulink_status = simulink_status.stdout
nodered_status = nodered_status.stdout
subprocess.run(["systemctl", "stop", "go-simulink"])
subprocess.run(["systemctl", "stop", "nodered"])
subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering.js"])	


with open("/usr/module-firmware/modules.txt", "r") as modules:
    info = modules.readline()

modules_to_update = []
error_array = []

modules = info.split(":")
for i,module in enumerate(modules):
    if len(module) >0:
        split = module.split("-")
        current_software = "-".join(split[-3:])
        mod_type = "-".join(split[0:4])
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


    newest_firmwares = list(dict.fromkeys(newest_firmwares))
    for firmware in newest_firmwares:
        if mod_type in firmware:
            if current_software not in firmware:
                modules_to_update.append([i+1,firmware.split("/")[-1]])

if len(modules_to_update) > 0:
    with Pool() as p:
        results = p.map(upload_firmware, modules_to_update)
        print(results)
    for result in results:
        if "error" in result[1]:
            error_array.append(":".join(result))
if len(error_array) > 0:
    print("Errors:")
    print(error_array)

print(repr(nodered_status))

if not "in" in simulink_status:
    subprocess.run(["systemctl", "start", "go-simulink"])
if not "in" in nodered_status:
    subprocess.run(["systemctl", "start", "nodered"])