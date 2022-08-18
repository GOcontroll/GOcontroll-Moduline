#!/usr/bin/python3
import subprocess
import threading
def led_flashing():
    subprocess.run(["node", "/usr/moduline/nodejs/flash-led.js", "6"])

tf = threading.Thread(target=led_flashing)
tf.start()
subprocess.run(["cat", "/sys/firmware/devicetree/base/hardware"])
print("\n")
subprocess.run(["lsb_release", "-a"])
subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering"],stdout=subprocess.PIPE, text=False)
with open("/usr/module-firmware/modules.txt", "r") as modulesfile:
    layout = modulesfile.readline()

output=[["Slot", "Type", "HW Version", "SW Version"]]   

modules = layout.split(":")
for i,module in enumerate(modules):
    moduleSplit = module.split("-")
    if "20-10-1" in module:
        output.append([f"{i+1}", "6 channel input", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    elif "20-10-2" in module:
        output.append([f"{i+1}", "10 channel input", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    elif "20-20-1" in module:
        output.append([f"{i+1}", "2 channel power bridge", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    elif "20-20-2" in module:
        output.append([f"{i+1}", "6 channel output", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    elif "20-20-2" in module:
        output.append([f"{i+1}", "10 channel output", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    elif "20-30-3" in module:
        output.append([f"{i+1}", "IR communication", moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]])
    else:
        output.append(["-", "-", "-", "-"])

s = [[str(e) for e in row] for row in output]
lens = [max(map(len, col)) for col in zip(*s)]
fmt = '\t'.join('{{:{}}}'.format(x) for x in lens)
table = [fmt.format(*row) for row in s]
print('\n'.join(table))
