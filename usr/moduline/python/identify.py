#!/usr/bin/python3
import subprocess
import threading
import sys

args = sys.argv[1:]
def led_flashing():
    subprocess.run(["node", "/usr/moduline/nodejs/flash-led.js", "6"])

tf = threading.Thread(target=led_flashing)
tf.start()
subprocess.run(["cat", "/sys/firmware/devicetree/base/hardware"])
print("\n")
subprocess.run(["lsb_release", "-a"])
stdout = subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering"],stdout=subprocess.PIPE, text=False)
stdout = stdout.stdout
with open("/usr/module-firmware/modules.txt", "r") as modulesfile:
    layout = modulesfile.readline()[:-1]

    manufacturers = modulesfile.readline()[:-1]
    moduleQRsfront = modulesfile.readline()[:-1]
    moduleQRsback = modulesfile.readline() 

modules = layout.split(":")
manufacturers = manufacturers.split(":")
moduleQRsfront = moduleQRsfront.split(":")
moduleQRsback = moduleQRsback.split(":")

try:
    mode = args[0]
except:
    mode =""

if mode=="-v":
    output=[["Slot", "Type", "HW Version", "SW Version", "Manufacturer", "QR front", "QR back"]]   
    for i,module in enumerate(modules):
        toAppend = [f"{i+1}"]
        moduleSplit = module.split("-")
        if "20-10-1" in module:
            toAppend.append("6 channel input")
        elif "20-10-2" in module:
            toAppend.append("10 channel input")
        elif "20-20-1" in module:
            toAppend.append("2 channel power bridge")
        elif "20-20-2" in module:
            toAppend.append("6 channel output")
        elif "20-20-2" in module:
            toAppend.append("10 channel output")
        elif "20-30-3" in module:
            toAppend.append("IR communication")
        else:
            toAppend = toAppend + ["-", "-", "-", "-", "-", "-"]
            output.append(toAppend)
            continue
        toAppend = toAppend + [moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6], manufacturers[i], moduleQRsfront[i], moduleQRsback[i]]
        output.append(toAppend)
else:
    output=[["Slot", "Type", "HW Version", "SW Version"]]   
    for i,module in enumerate(modules):
        toAppend = [f"{i+1}"]
        moduleSplit = module.split("-")
        if "20-10-1" in module:
            toAppend.append("6 channel input")
        elif "20-10-2" in module:
            toAppend.append("10 channel input")
        elif "20-20-1" in module:
            toAppend.append("2 channel power bridge")
        elif "20-20-2" in module:
            toAppend.append("6 channel output")
        elif "20-20-2" in module:
            toAppend.append("10 channel output")
        elif "20-30-3" in module:
            toAppend.append("IR communication")
        else:
            toAppend = toAppend + ["-", "-", "-"]
            output.append(toAppend)
            continue
        toAppend = toAppend + [moduleSplit[3], moduleSplit[4]+"."+moduleSplit[5]+"."+moduleSplit[6]]
        output.append(toAppend)

s = [[str(e) for e in row] for row in output]
lens = [max(map(len, col)) for col in zip(*s)]
fmt = '\t'.join('{{:{}}}'.format(x) for x in lens)
table = [fmt.format(*row) for row in s]
print('\n'.join(table))
