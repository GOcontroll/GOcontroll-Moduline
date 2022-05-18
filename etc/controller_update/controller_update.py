#!/usr/bin/python3
from subprocess import run
try:
    run(["rm", "-r", "/tmp/Rick-GO-GOcontroll*"])
except FileNotFoundError:
    print("file already gone")

with open("/etc/controller_update/backed-up-files.txt" , "r") as backup:
    files = backup.readlines()

for i, file in enumerate(files):
    files[i] = file.split("\'")[-2][2:]+"\n"

with open("/etc/controller_update/backed-up-files.txt" , "w") as backup:
    backup.writelines(files)

