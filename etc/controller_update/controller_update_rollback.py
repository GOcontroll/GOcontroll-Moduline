#!/usr/bin/python3
import os

arg = input("are you sure you want to undo the last update? y/n: ")

if arg == "y" or arg == "Y":
    with open("/etc/controller_update/backed-up-files.txt", "r") as backup:
        for line in backup.readlines():
            try:
                os.replace(line[:-1], line[:-2])
            except:
                print("backup file is missing:" + line)
    os.remove("/etc/controller_update/backed-up-files.txt")