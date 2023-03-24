#!/usr/bin/python3
import requests
import subprocess
from github import Github
import os
import zipfile
import glob
from packaging import version

#checks if the controller is connected to the internet
def check_connection(timeout=1):
	stdout = subprocess.run(["timeout", "-k", str(timeout), str(timeout), "ping", "google.com"], stdout=subprocess.PIPE, text=True)
	if not bool(stdout.stdout):
		print(f"google was not reached{stdout.stdout}")
		stdout = subprocess.run(["timeout", "-k", str(timeout), str(timeout), "ping", "github.com"], stdout=subprocess.PIPE, text=True)
		print(f"second test {stdout.stdout}")
		return bool(stdout.stdout)
	return bool(stdout.stdout)

def install_update():
    with zipfile.ZipFile("/tmp/temporary.zip", "r") as zip_ref:
        zip_ref.extractall("/tmp")
    try:
        os.remove("/tmp/temporary.zip")
    except:
        print("file was not yet created")
    print("Update finished downloading.")
    install_script = glob.glob("/tmp/GOcontroll-*/etc/controller_update/controller_update.sh")
    subprocess.run(["bash", install_script[0]])


#update the controller through its own network connection
def update_controller_local(zip_url):
    print("Update found, updating...")
    try:
        file = requests.get(zip_url, stream=True)
        with open("/tmp/temporary.zip", "wb") as zip:
            for chunk in file.iter_content(chunk_size=1024):
                if chunk:
                    zip.write(chunk)
    except:
        print("update failed, /tmp/temporary.zip was not created")
        exit()
    install_update()

############################################################################################################################################
#execution starts here

#get update mode
input = input("give update type, development or stable:\n")
if input in "stable":
    mode = "s"
elif input in "development":
    mode = "d"
else:
    print("invalid mode enterent, terminating...")
    exit()


if (check_connection(0.5)):
    if mode == "s":
        try:
            with open("/etc/controller_update/current-release.txt", "r") as file:
                current_release = file.readline()
        except:
            print("/etc/controller_update/current-release.txt is missing.")
            exit()
        if current_release[-1] == "\n":
            current_release = current_release[:-1]
        with open("/etc/bluetooth/accesstoken.txt", "r") as file:
            token = file.readline()
        if token[-1] == "\n":
            token = token[:-1]

        try:
            g = Github(token)
            r = g.get_repo("GOcontroll/GOcontroll-Moduline")

            releases = r.get_releases()
            for release in releases:
                latest_release = release.tag_name[1:]
                if "-" not in latest_release:
                    if version.parse(latest_release) > version.parse(current_release):
                        zip_url = release.zipball_url
                        update_controller_local(zip_url)
                        exit(0)
            else:
                print("No new Stable build found, your controller is up-to-date!")
        except:
            print("Controller was not able to access github and/or find the right release.")
            exit()
    else:
        update_controller_local("https://github.com/GOcontroll/GOcontroll-Moduline/archive/refs/heads/master.zip")
else:
    print("Controller has no internet access.")
