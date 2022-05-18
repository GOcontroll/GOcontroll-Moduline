#!/usr/bin/python3
import os

with open("/etc/controller_update/backed-up-files.txt", "r") as backup:
    for line in backup.readlines():
        try:
            os.replace(line[:-1], line[:-2])
        except:
            print("backup file is missing")
os.remove("/etc/controller_update/backed-up-files.txt")