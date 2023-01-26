#!/usr/bin/python3
from glob import glob
from shutil import rmtree
try:
    rmtree(glob("/tmp/GOcontroll-*")[0])
except:
    print("file already gone")

with open("/etc/controller_update/backed-up-files.txt" , "r") as backup:
    files = backup.readlines()

for i, file in enumerate(files):
    path = file.split("\'")[-2]
    if path[-1] =="~":
        files[i] = path +"\n"
    else:
        files[i] = ""

with open("/etc/controller_update/backed-up-files.txt" , "w") as backup:
    backup.writelines(files)
#
