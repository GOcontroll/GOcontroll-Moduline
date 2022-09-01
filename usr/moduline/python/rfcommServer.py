#!/usr/bin/python3
from bluedot.btcomm import BluetoothServer
import requests
from signal import pause
import subprocess
import time
import rfcommServerConstants as commands
import rfcommServerConfig as fe #function enabled
import hashlib
from smbus2 import SMBus
from github import Github
import threading
import os
import zipfile
import netifaces as ni
import serial
from multiprocessing import Process, Pool
import multiprocessing
import glob
from packaging import version
import signal
import traceback

#calculates the sha1 checksum of a file
def sha1(fname):
	hash_sha1 = hashlib.sha1()
	with open(fname, "rb") as f:
		for chunk in iter(lambda: f.read(4096), b""):
			hash_sha1.update(chunk)
	return hash_sha1.hexdigest()

#returns the first line of a file that a search term is present in
def get_line(path, search_term):
	with open(path, "r") as file:
		i =0
		for line in file:
			if search_term in line:
				return i
			i += 1
		return False

#checks if the controller is connected to the internet
def check_connection(timeout=1):
	stdout = subprocess.run(["timeout", "-k", str(timeout), str(timeout), "ping", "google.com"], stdout=subprocess.PIPE, text=True)
	if not bool(stdout.stdout):
		print(f"google was not reached{stdout.stdout}")
		stdout = subprocess.run(["timeout", "-k", str(timeout), str(timeout), "ping", "github.com"], stdout=subprocess.PIPE, text=True)
		print(f"second test {stdout.stdout}")
		return bool(stdout.stdout)
	return bool(stdout.stdout)
	

#thread that makes a led fade in and out in the colour blue
def status_led_on():
	direction = 0
	brightness = 0
	while 1 == 1:
		time.sleep(0.01)
		if direction == 0:
			brightness += 1
		else:
			brightness -= 1
		with SMBus(2) as bus:
			bus.write_i2c_block_data(address,0x0D,[brightness])
		if brightness == 127:
			direction = 1
		if brightness == 0:
			direction = 0
			if kill_threads:
				break

#thread that makes an led flash in the colour orange
def status_led_gocontroll():
	while 1==1:
		try:
			with SMBus(2) as bus:
				bus.write_i2c_block_data(address, 0x0D, [0])
				bus.write_i2c_block_data(address, 0x0B, [165])
				bus.write_i2c_block_data(address, 0x0C, [50])
			if(kill_threads):
				break
			time.sleep(0.5)
			with SMBus(2) as bus:
				bus.write_i2c_block_data(address, 0x0D, [0])
				bus.write_i2c_block_data(address, 0x0B, [0])
				bus.write_i2c_block_data(address, 0x0C, [0])
		except:
			print("unable to send i2c message")
			break
		time.sleep(0.5)
		if(kill_threads_shutdown):
			break

##########################################################################################
#commands to be executed by controller
##########################################################################################

#verify device
#handles device verification

def verify_device(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	if (level1 == commands.DEVICE_VERIFICATION_ATTEMPT):
		global trust_device
		split_arg = arg.split(":")
		device_id = split_arg[-1]
		entered_key = ":".join(split_arg[:-1])
		try:
			with open("/etc/bluetooth/trusted_devices.txt", "r") as trusted_devices:
				passkey = trusted_devices.readline()
		except:
			subprocess.run(["python3", "/usr/moduline/python/btKeyGen.py"])
			try:
				with open("/etc/bluetooth/trusted_devices.txt", "r") as trusted_devices:
					passkey = trusted_devices.readline()
			except:
				request_verification(commands.DEVICE_VERIFICATION_FILE_MISSING)
				return
		if (passkey[:-1].lower() == entered_key.lower()):
			trust_device = True
			with open("/etc/bluetooth/trusted_devices.txt", "a") as add_trusted_device:
				add_trusted_device.write(device_id + "\n")
			request_verification(commands.DEVICE_VERIFICATION_SUCCESS)
		else:
			request_verification(commands.DEVICE_VERIFICATION_INCORRECT_PASSKEY)

	
	elif (level1 == commands.DEVICE_VERIFICATION_EXCHANGE_KEY):
		try:
			with open("/etc/bluetooth/trusted_devices.txt", "r") as trusted_devices:
				if (trusted_devices.read().find(arg) != -1):
					trust_device = True
				else:
					request_verification(commands.DEVICE_VERIFICATION_MISSING)
		except:
			subprocess.run(["python3", "/usr/moduline/python/btKeyGen.py"])
			request_verification(commands.DEVICE_VERIFICATION_MISSING)

			
#part of the verification structure but is called from multiple places
def request_verification(char):
	send(chr(commands.VERIFY_DEVICE)+chr(char))

##########################################################################################

#update controller
#contains the logic for updating the controller

def update_controller(commandnmbr, arg):
	global zip_url
	level1 = ord(arg[0])
	arg = arg[1:]
	if (level1 == commands.CHECK_FOR_UPDATE):
		try:
			with open("/etc/controller_update/current-release.txt", "r") as file:
				current_release = file.readline()
		except:
			send(chr(commandnmbr) + chr(commands.UPDATE_VERSION_FILE_MISSING))
			return
		if current_release[-1] == "\n":
			current_release = current_release[:-1]
		if (check_connection(0.5)):
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
							send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_TRUE) + chr(commands.CONTROLLER_UPDATE_AVAILABLE))
							# send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_FALSE) + current_release)
							# bottom line is for testing update over bluetooth while the controller is actually connected to the internet
							return
						send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_TRUE))
						return
				send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_TRUE))
				# send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_FALSE) + current_release)
				# bottom line is for testing update over bluetooth while the controller is actually connected to the internet
			except:
				send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_FALSE) + current_release)
		else:
			send(chr(commandnmbr) + chr(commands.CONTROLLER_INTERNET_ACCESS_FALSE) + current_release)

			
	#update the controller through its own network connection
	elif (level1==commands.UPDATE_CONTROLLER_LOCAL):
		try:
			file = requests.get(zip_url, stream=True)
			with open("/tmp/temporary.zip", "wb") as zip:
				for chunk in file.iter_content(chunk_size=1024):
					if chunk:
						zip.write(chunk)
		except:
			send(chr(commandnmbr) + chr(commands.UPDATE_LOCAL_FAILED))
			return
		install_update()
		send(chr(commandnmbr) + chr(commands.UPDATE_LOCAL_SUCCESS))

	#transferred file cleared the checksum test
	elif (level1 == commands.UPDATE_FILE_APROVED):
		install_update()
		send(chr(commandnmbr) + chr(commands.UPDATE_LOCAL_SUCCESS))

	#transferred file did not clear the checksum test or file transfer was cancelled
	elif (level1 == commands.UPDATE_FILE_CORRUPTED):
		print("file was corrupted")
		try:
			os.remove("/tmp/temporary.zip")
		except:
			print("file was not yet created")

			
def install_update():
	with zipfile.ZipFile("/tmp/temporary.zip", "r") as zip_ref:
		zip_ref.extractall("/tmp")
	try:
		os.remove("/tmp/temporary.zip")
	except:
		print("file was not yet created")
	install_script = glob.glob("/tmp/GOcontroll-GOcontroll*/etc/controller_update/controller_update.sh")
	subprocess.run(["bash", install_script[0]])
	
	

###########################################################################################

#file transfer
#sets up the script to receive a file

def file_transfer(commandnmbr, arg):
	global transfer_mode
	global first_write
	global file_size
	global i
	global progress
	progress = 0
	i = 0
	first_write = 1
	transfer_mode = 1
	file_size = int(arg)
	send(chr(commandnmbr)+chr(commands.FILE_TRANSFER_ENABLED))
	tf = threading.Thread(target=check_for_file_reception)
	tf.start()

#handles the receiving of filedata over bluetooth
def receive_zip(data):
	global file_timeout
	global transfer_mode
	global first_write
	global i
	global progress
	global file_size
	file_timeout = 0
	progress_check = progress
	i += 1
	progress = int(((i*990)/file_size)*100)
	if progress > progress_check: #only send progress when it changes to clear up bluetooth bandwidth
		send(chr(commands.FILE_TRANSFER) + chr(commands.FILE_TRANSFER_PROGRESS) + chr(progress))
	if first_write == 1:
		with open("/tmp/temporary.zip", "wb") as file:
			file.write(data)
		first_write =0
	else:
		with open("/tmp/temporary.zip", "ab") as file:
			file.write(data)
	if file_size==os.path.getsize("/tmp/temporary.zip"):
		transfer_mode = "command"
		checksum = sha1("/tmp/temporary.zip")
		time.sleep(0.2)
		send(chr(commands.FILE_TRANSFER)+chr(commands.FILE_TRANSFER_COMPLETE)+checksum)

#watchdog timer for file reception, stops the script from getting stuck in file reception mode
def check_for_file_reception():
	global file_timeout
	global transfer_mode
	global kill_threads
	file_timeout = 0
	while file_timeout <= 2:
		time.sleep(0.5)
		file_timeout += 0.5
		if kill_threads:
			break
	if transfer_mode != "command":
		send(chr(commands.FILE_TRANSFER) + chr(commands.NO_FILE_RECEIVED))
		transfer_mode = "command"

#send(filetransfer + filetransfer state + (progress))
##########################################################################################

#ethernet settings

def ethernet_settings(commandnmbr, arg):
	path = "/etc/NetworkManager/system-connections/Wired connection static.nmconnection"
	level1 = ord(arg[0])
	global mode
	arg = arg[1:]

	#get the information for the ethernet settings screen
	if level1 == commands.INIT_ETHERNET_SETTINGS:
		connection_status = "False"
		connection_status = str(check_connection(0.5))
		stdout = subprocess.run(["nmcli", "con"], stdout=subprocess.PIPE, text=True)
		result = stdout.stdout
		result = result.split("\n")
		mode = "auto"
		ip = "-"
		ip_static = "missing"
		for name in result:
			if "Wired connection static" in name:
				if "eth0" in name:
					mode= "static"
					break
			elif "Wired connection auto" in name:
				if "eth0" in name:
					mode= "auto"
					break
			elif "Wired connection 1" in name:
				subprocess.run(["nmcli", "con", "mod", "Wired connection 1", "con-name", "Wired connection auto"])
				if "eth0" in name:
					mode="auto"
					break
		try:
			ip = ni.ifaddresses("eth0")[ni.AF_INET][0]["addr"]
		except:
			ip = "no IP available"
		try:
			with open(path, "r") as con:
				ip_line = get_line(path, "address1=")
				file = con.readlines()
				ip_static = file[ip_line].split("=")[1]
				ip_static = ip_static.split("/")[0]
		except:
			subprocess.run(["nmcli", "con", "add", "type", "ethernet", "con-name", "Wired connection static", "ifname", "eth0", "ipv4.addresses", "192.168.255.255/16", "ipv4.method", "manual", "connection.autoconnect", "no"])
			try:
				with open(path, "r") as con:
					ip_line = get_line(path, "address1=")
					file = con.readlines()
					ip_static = file[ip_line].split("=")[1]
					ip_static = ip_static.split("/")[0]
			except:
				ip_static = "missing"
		send(chr(commandnmbr) + chr(commands.INIT_ETHERNET_SETTINGS) + mode + ":" + ip_static + ":" + ip + ":" + connection_status)

	#apply changes that were made by the user
	elif level1 == commands.SET_ETHERNET_SETTINGS:
		subprocess.run(["nmcli", "con", "mod", "Wired connection static", "ipv4.addresses", "192.168."+arg+"/16"])
		if (mode == "static"):
			subprocess.run(["nmcli", "con", "up", "Wired connection auto"])
			time.sleep(0.5)
			subprocess.run(["nmcli", "con", "up", "Wired connection static"])
			time.sleep(0.5)
		ethernet_settings(commandnmbr, chr(commands.INIT_ETHERNET_SETTINGS) + "")

	#switch between static or dynamic ip connection
	elif level1 == commands.SWITCH_ETHERNET_MODE:
		if arg == "true":
			subprocess.run(["nmcli", "con", "mod", "Wired connection auto", "connection.autoconnect", "no"])
			subprocess.run(["nmcli", "con", "mod", "Wired connection static", "connection.autoconnect", "yes"])
			subprocess.run(["nmcli", "con", "up", "Wired connection static"])
			mode = "static"
		else:
			subprocess.run(["nmcli", "con", "mod", "Wired connection auto", "connection.autoconnect", "yes"])
			subprocess.run(["nmcli", "con", "mod", "Wired connection static", "connection.autoconnect", "no"])
			subprocess.run(["nmcli", "con", "up", "Wired connection auto"])
			mode = "auto"
		ethernet_settings(commandnmbr, chr(commands.INIT_ETHERNET_SETTINGS) + "")


##########################################################################################
 
#wireless settings

def wireless_settings(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	#get information to set up the main wireless settings screen
	if level1 == commands.INIT_WIRELESS_SETTINGS:
		stdout = subprocess.run(["nmcli", "con"], stdout=subprocess.PIPE, text=True)
		result = stdout.stdout
		status = "wifi"
		if "GOcontroll-AP" not in result:
			subprocess.run(["nmcli", "con", "add", "type", "wifi", "con-name", "GOcontroll-AP", "ifname", "wlan0", "ssid", "GOcontroll-AP", "ipv4.addresses", "192.168.19.85/16", "ipv4.method", "manual", "connection.autoconnect", "no", "802-11-wireless.band", "bg", "wifi-sec.psk", "GOcontrolltest", "802-11-wireless-security.key-mgmt", "wpa-psk"])
			status = "wifi"
		else:
			result = result.split("\n")
			for con in result:
				if "GOcontroll-AP" in con:
					if "wlan0" in con:
						status = "ap"
						break
		connection_status = str(check_connection(0.5))
		try:
			ip = ni.ifaddresses("wlan0")[ni.AF_INET][0]["addr"]
		except:
			ip = "no IP available"
		send(chr(commands.WIRELESS_SETTINGS) + chr(commands.INIT_WIRELESS_SETTINGS) + status + ":" + connection_status + ":" + ip)
		return
	

	#get the list of networks available to the controller
	elif level1 == commands.GET_WIFI_NETWORKS:
		wifi_list = subprocess.run(["nmcli", "-t", "dev", "wifi"], stdout=subprocess.PIPE, text=True) #gets the list in a layout optimal for scripting, networks seperated by \n, columns seperated by :
		networks = wifi_list.stdout[:-1].split("\n")
		i=len(networks)-1
		for n in range(len(networks)):
			networks[i] = networks[i].split(":")
			if len(networks[i]) < 2:
				networks.pop(i)
			elif len(networks[i]) > 8: #new Network manager (bullseye) format, includes mac address at index 1, but it gets split by : aswell which is annoying.
				if networks[i][7]=="":
					networks.pop(i)
				else:
					networks[i] = [networks[i][0],networks[i][7],networks[i][11],networks[i][13]]
					if networks[i][3] == "":
						networks[i][3] = "No Security"
					networks[i] = ":".join(networks[i])
			else: # old Network manager (buster) format, does not include mac address
				if networks[i][1]=="": #if this is true the current index contains a network with no name
					networks.pop(i)
				else:
					networks[i] = [networks[i][0],networks[i][1],networks[i][5],networks[i][7]]
					if networks[i][3]=="":
						networks[i][3] = "No Security"
					networks[i] = ":".join(networks[i])
			i -=1
		networks.sort(reverse=True)
		networks = "\n".join(networks)
		
		send(chr(commandnmbr) + chr(commands.GET_WIFI_NETWORKS) + networks)
		return


	#show devices connected to the access point
	#TODO implement
	elif level1 == commands.GET_CONNECTED_DEVICES:
		final_device_list = []
		stdout = subprocess.run(["ip", "n", "show", "dev", "wlan0"], stdout=subprocess.PIPE, text=True)
		connected_devices = stdout.stdout.split("\n")
		i = len(connected_devices) -1
		for n in range(len(connected_devices)):
			if "REACHABLE" not in connected_devices[i] and "DELAY" not in connected_devices[i]:
				connected_devices.pop(i)
			i -=1

		stdout = subprocess.run(["cat", "/var/lib/misc/dnsmasq.leases"], stdout=subprocess.PIPE, text=True)
		previous_connections = stdout.stdout.split("\n")[:-1]

		for i, connected_device in enumerate(connected_devices):
			connected_device_list = connected_device.split(" ")
			for j, previous_connection in enumerate(previous_connections):
				if connected_device_list[2] in previous_connection:
					final_device_list.append(";".join([connected_device_list[2], previous_connection.split(" ")[3]]))
		send(chr(commandnmbr) + chr(level1) + "\n".join(final_device_list))
		return


	#gather the information about the access point for the user
	elif level1 == commands.INIT_AP_SETTINGS:
		path = "/etc/NetworkManager/system-connections/GOcontroll-AP.nmconnection"
		with open(path , "r") as settings:
			file = settings.readlines()
			ssid_line = get_line(path, "ssid=")
			psk_line = get_line(path, "psk=")
			ssid = file[ssid_line].split("=")[1][:-1]
			psk = file[psk_line].split("=")[1][:-1]
		send(chr(commandnmbr) + chr(commands.INIT_AP_SETTINGS) + ssid + ":" + psk)


	#sconnect to a wifi network specified in the command argument
	elif level1 == commands.CONNECT_TO_WIFI:
		#seperate arg
		message_list = arg.split(":")
		#attempt to connect to a network with the given arguments
		result = subprocess.run(["nmcli", "device", "wifi", "connect", message_list[0], "password", message_list[1]], stdout=subprocess.PIPE, text=True)
		#save the result
		resultstring = result.stdout
		#possible results:
		#Error: No network with SSID 'dfg' found.
		#Error: Connection activation failed: (7) Secrets were required, but not provided.
		#Device 'wlan0' successfully activated with 'uuid'
		if (resultstring.find("successfully")!=-1):
			connection_result = commands.WIFI_CONNECT_SUCCESS
		elif (resultstring.find("Secrets")!=-1):
			connection_result = commands.WIFI_CONNECT_FAILED_INC_PW
			subprocess.run(["nmcli", "connection", "delete", "id", message_list[0]])
		elif (resultstring.find("SSID")!=-1):
			connection_result = commands.WIFI_CONNECT_FAILED_INC_SSID
			subprocess.run(["nmcli", "connection", "delete", "id", message_list[0]])
		else:
			connection_result = commands.WIFI_CONNECT_FAILED_UNKNOWN
			subprocess.run(["nmcli", "connection", "delete", "id", message_list[0]])
		#give feedback to the app
		send(chr(commandnmbr) + chr(commands.CONNECT_TO_WIFI) + chr(connection_result))

	#disconnect from a wifi network specified in the command argument
	elif level1 == commands.DISCONNECT_FROM_WIFI:
		#attempt to disconnect from specified network
		result = subprocess.run(["nmcli", "connection", "delete", "id", arg], stdout=subprocess.PIPE, text=True)
		#save the result
		resultstring = result.stdout
		#possible results:
		#Connection 'name' (uuid) succesfully deleted.
		#Error: unknown connection 'name'.\n
		#Error: cannot delete unknown connection(s): id 'name'
		if (resultstring.find("successfully")!=-1):
			disconnection_result = commands.WIFI_DISCONNECT_SUCCESS
		else:
			disconnection_result = commands.WIFI_DISCONNECT_FAILED
		#give feedback to the app
		send(chr(commandnmbr) + chr(commands.DISCONNECT_FROM_WIFI) + chr(disconnection_result))

	#switch between access point or wifi receiver mode
	elif level1 == commands.SWITCH_WIRELESS_MODE:
		#to make the switch permanent all wifi connections need to have their autoconnect settings altered
		#so all wifi connections need to be gathered
		stdout = subprocess.run(["nmcli", "-t", "con"], stdout=subprocess.PIPE, text=True)
		stdout = stdout.stdout[:-1].split("\n")
		wifi_connections = []
		for i, con in enumerate(stdout):
			if "wireless" in con:
				if "GOcontroll-AP" not in con:
					wifi_connections.append(con.split(":")[0])
		if arg == "ap":
			for con in wifi_connections:
				subprocess.run(["nmcli", "con", "mod", con, "connection.autoconnect", "no"])
			subprocess.run(["nmcli", "con", "mod", "GOcontroll-AP", "connection.autoconnect", "yes"])
			stdout = subprocess.run(["nmcli", "con", "up", "GOcontroll-AP"], stdout=subprocess.PIPE, text=True)
			result = stdout.stdout
			if "successfully" in result:
				send(chr(commandnmbr) + chr(commands.SWITCH_WIRELESS_MODE) + "ap")
			else:
				send(chr(commandnmbr) + chr(commands.SWITCH_WIRELESS_MODE) + "error")
		elif arg == "wifi":
			for con in wifi_connections:
				subprocess.run(["nmcli", "con", "mod", con, "connection.autoconnect", "yes"])
			subprocess.run(["nmcli", "con", "mod", "GOcontroll-AP", "connection.autoconnect", "no"])
			stdout = subprocess.run(["nmcli", "con", "down", "GOcontroll-AP"], stdout=subprocess.PIPE, text=True)
			result = stdout.stdout
			if "successfully" in result:
				send(chr(commandnmbr) + chr(commands.SWITCH_WIRELESS_MODE) + "wifi")
			else:
				send(chr(commandnmbr) + chr(commands.SWITCH_WIRELESS_MODE) + "error")

##########################################################################################

#access point settings
#handles changing and displaying access point settings

def access_point_settings(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]


	#apply changes the user made to the access point
	if level1 == commands.SET_AP_SETTINGS:
		arg = arg.split(":")
		name = arg[0]
		psk = arg[1]
		subprocess.run(["nmcli", "con", "mod", "GOcontroll-AP", "802-11-wireless.ssid", name])
		subprocess.run(["nmcli", "con", "mod", "GOcontroll-AP", "wifi-sec.psk", psk])
		reload = subprocess.run(["nmcli", "con", "down", "GOcontroll-AP"], stdout=subprocess.PIPE, text=True)
		reload = reload.stdout
		if "succesfully" in reload:
			subprocess.run(["nmcli", "con", "up", "GOcontroll-AP"])
		send(chr(commandnmbr) + chr(commands.SET_AP_SETTINGS) + "done")


	#initialize the screen for the user
	elif level1 == commands.INIT_AP_SETTINGS:
		path = "/etc/NetworkManager/system-connections/GOcontroll-AP.nmconnection"
		with open(path , "r") as settings:
			file = settings.readlines()
			ssid_line = get_line(path, "ssid=")
			psk_line = get_line(path, "psk=")
			ssid = file[ssid_line].split("=")[1][:-1]
			psk = file[psk_line].split("=")[1][:-1]
		send(chr(commandnmbr) + chr(commands.INIT_AP_SETTINGS) + ssid + ":" + psk)

##########################################################################################

#controller setttings
#handles displaying the right information and setting a new bluetooth name

def controller_settings(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	#change the bluetooth name
	if level1 == commands.SET_CONTROLLER_SETTINGS:
		try:
			if "GOcontroll" in arg:
				write_device_name(arg)
			else:
				arg = "GOcontroll-" + arg
				write_device_name(arg)
			send(chr(commandnmbr) + chr(commands.SET_CONTROLLER_SETTINGS) + "1")
		except:
			send(chr(commandnmbr) + chr(commands.SET_CONTROLLER_SETTINGS) + "0")

	#gather information to display
	elif (level1 == commands.INIT_CONTROLLER_SETTINGS):
		time.sleep(0.2) #if the controller responds too quick the app gets wacky
		with open("/sys/firmware/devicetree/base/hardware", "r") as file:
			hardware_version = file.read()
		with open("/root/version.txt", "r") as file:
			software_version = file.read(6)
		with open("/etc/machine-info", "r") as file:
			controller_name = file.read().split("=")
		try:
			name = controller_name[1]
		except IndexError:
			name = "faulty name"
		send(chr(commandnmbr) + chr(commands.INIT_CONTROLLER_SETTINGS) + hardware_version + ":" + software_version + ":" + name)

#write the new bluetooth name to the right file
def write_device_name(name):
	with open("/etc/machine-info", "w") as file:
		file.write("PRETTY_HOSTNAME="+name)

##########################################################################################

#controller programs
#handles toggling controller programs/services

def controller_programs(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]


	#initialize the screen for the user
	if level1 == commands.INIT_CONTROLLER_PROGRAMS:
		statusses = []
		services = arg.split(":")
		for service in services:
			stdout = subprocess.run(["systemctl", "is-active", service], stdout=subprocess.PIPE, text=True)
			status = stdout.stdout[:-1]
			statusses.append(status)
		send(chr(commandnmbr)+chr(commands.INIT_CONTROLLER_PROGRAMS) + ":".join(statusses))
	
	
	#apply change to a service
	elif level1 == commands.SET_CONTROLLER_PROGRAMS:
		data = arg.split(":")
		service = data[-1]
		new_states = data[:-1]
		if len(data)>2:
			for new_state in new_states:
				stdout = subprocess.run(["systemctl", new_state, service], stderr=subprocess.PIPE, text=True)
				stdout = stdout.stderr
				print("test")
				if "Failed" in stdout:
					send(chr(commandnmbr) + chr(commands.SET_CONTROLLER_PROGRAMS) + "0:" + stdout.split(":")[1] + ":" + service)
					return
			send(chr(commandnmbr) + chr(commands.SET_CONTROLLER_PROGRAMS) + "1::")
			return
		send(chr(commandnmbr) + chr(commands.SET_CONTROLLER_PROGRAMS) + "0:Message received was incorrect.:" + service)
		

##########################################################################################

#wwan settings
#handles displaying the status of the cellular service and making changes to it

def wwan_settings(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	#initialize the screen for the user
	if level1 == commands.INIT_WWAN_SETTINGS:
		net_status = [str(check_connection(0.5))]
		mmcli_info = ["Info not available"]
		sim_number = ["Info not available"]
		pin=["-"]
		apn=["-"]
		stdout = subprocess.run(["systemctl", "is-active", "go-wwan"], stdout=subprocess.PIPE, text=True)
		status = [stdout.stdout[:-1]]
		path = "/etc/NetworkManager/system-connections/GO-celular.nmconnection"
		if status[0] == "active":
			try:
				pin_line = get_line(path, "pin=")
				apn_line = get_line(path, "apn=")
				with open(path, "r") as con:
					file = con.readlines()
					pin = [file[pin_line].split("=")[1][:-1]]
					apn = [file[apn_line].split("=")[1][:-1]]
			except FileNotFoundError:
				print("networkmanager connection file doesn't exist")
			modem = subprocess.run(["mmcli", "--list-modems"], stdout=subprocess.PIPE, text=True)
			modem = modem.stdout
			if "/freedesktop/" in modem:
				modem_number = modem.split("/")[-1].split(" ")[0]
				try:
					mmcli = subprocess.Popen(("mmcli", "-K", "--modem="+modem_number), stdout=subprocess.PIPE)
					output = subprocess.check_output(("egrep", "model|signal-quality.value|imei|operator-name"), stdin=mmcli.stdout)
					mmcli.wait()
					mmcli_info = output[:-1].decode("utf-8").split("\n")
					for i, info in enumerate(mmcli_info):
						mmcli_info[i] = info.split(":")[1][1:]
				except subprocess.CalledProcessError:
					print("unable to get information from modemmanager")
			at_result = sim_at_command("AT+CICCID\r", timeout=2)
			if at_result == "Error":
				at_result = "Unable to get SIM number"
			else:
				sim_number = [at_result.split(" ")[1].split("\r")[0]]
		status_array = net_status+status+mmcli_info+pin+apn+sim_number
		send(chr(commandnmbr) + chr(commands.INIT_WWAN_SETTINGS) + ":".join(status_array))

	#turn cellular on or off
	elif level1 == commands.SWITCH_WWAN:
		arg = arg.split(":")
		if arg[0] == "false":
			print("stopping go-wwan")
			subprocess.run(["systemctl", "stop", "go-wwan"])
			subprocess.run(["systemctl", "disable", "go-wwan"])
		else:
			if arg[1] == "false":
				print("starting go-wwan")
				subprocess.run(["systemctl", "enable", "go-wwan"])
				subprocess.run(["systemctl", "start", "go-wwan"])
			else: #service failed so needs to restart instead of start
				print("restarting go-wwan")
				subprocess.run(["systemctl", "restart", "go-wwan"])
		send(chr(commandnmbr) + chr(commands.SWITCH_WWAN))


	#apply changes the user made to cellular settings
	elif level1 == commands.SET_WWAN_SETTINGS:
		arg = arg.split(":")
		#arg = [pin,apn]
		subprocess.run(["nmcli", "con", "mod", "GO-celular", "gsm.apn", arg[1], "gsm.pin", arg[0]])
		# subprocess.run(["nmcli", "con", "mod", "GO-celular", "gsm.pin", arg[0]])
		reload = subprocess.run(["nmcli", "con", "down", "GO-celular"], stdout=subprocess.PIPE, text=True)
		reload = reload.stdout
		if "succesfully" in reload:
			subprocess.run(["nmcli", "con", "up", "GO-celular"])
		send(chr(commandnmbr) + chr(commands.SET_WWAN_SETTINGS))

#to read information from the modem a serial connection is used
#this function sends the command to the modem and starts a listener for the response
def sim_at_command(command, timeout=1):
	# print(f"starting the serial read process at {time.time() - message_received_timestamp} seconds after receiving the message.")
	recv_end, send_end = multiprocessing.Pipe(False)
	ts = Process(target=read_serial_CICCID, args=(send_end, timeout))
	ts.start()
	time.sleep(0.1)
	ser.write(bytes(command, "utf-8"))
	ts.join()
	if ts.is_alive():
		ts.terminate()
		return "Error"
	else:
		result = recv_end.recv()
		return result
	
#seperate process that listens for the response from the modem
def read_serial_CICCID(send_end, timeout):
	# process_start = time.time()
	# print(f"serial read proces started at {process_start - message_received_timestamp} seconds after receiving the message")
	global CICCID_watchdog
	tf = threading.Thread(target=read_serial_CICCID_watchdog, args=(timeout, os.getpid(), send_end))
	tf.start()
	while True:
		CICCID_watchdog = 0
		try:
			response = ser.readline().decode("utf-8")
			if "+ICCID:" in response:
				# print(f"serial read process ending at {time.time() - message_received_timestamp} seconds after receiving the message.\ntotal time elapsed by the serial read process: {(time.time() - process_start)}")
				final_response = response
				send_end.send(final_response)
				break
			if "ERR" in response:
				# print(f"serial read process ending at {time.time() - message_received_timestamp} seconds after receiving the message.\ntotal time elapsed by the serial read process: {(time.time() - process_start)}")
				send_end.send("Error")
				break
		except UnicodeDecodeError:
			# print(f"serial read process ending at {time.time() - message_received_timestamp} seconds after receiving the message.\ntotal time elapsed by the serial read process: {(time.time() - process_start)}")
			send_end.send("Error")
			break

#monitor the read serial process to make sure it doesn't get stuck
def read_serial_CICCID_watchdog(timeout, pid, send_end):
	# thread_start = time.time()
	# print(f"watchdog thread started {thread_start - message_received_timestamp} seconds after receiving the message.")
	global CICCID_watchdog
	CICCID_watchdog = 0
	while CICCID_watchdog < timeout:
		CICCID_watchdog += 0.2
		time.sleep(0.2)
	# print(f"watchdog thread timer ran out, total time elapsed: {(time.time() - thread_start)}")
	try:
		send_end.send("Error")
		os.kill(pid, signal.SIGTERM)
	except:
		print("process was already terminated")

##########################################################################################

#manage can settings
#display can info, turn on and off busses and change the baudrate

def can_settings(commandnmbr, arg):
	global read_can_bus_load
	level1 = ord(arg[0])
	arg = arg[1:]


	#initialize the screen for the user
	if level1 == commands.INIT_CAN_SETTINGS:
		read_can_bus_load = False
		print("Gathering can info")
		path = "/etc/network/interfaces"
		can_ifs_string = ""
		ip_a_info = subprocess.run(["ip", "-br", "a"], stdout=subprocess.PIPE, text=True)
		ip_a_info = ip_a_info.stdout
		ip_a_info_arr = ip_a_info.split("\n")
		for i in range(4):
			baudrate = "0"
			can_if = "|"
			if f"can{i}" in ip_a_info:
				can_if = "_"
				index = [idx for idx, s in enumerate(ip_a_info_arr) if f"can{i}" in s][0]
				if "UP" in ip_a_info_arr[index]:
					can_if = "-"
				baudrate = get_baudrate(i)
				baudrate = int(int(baudrate)/1000)
			can_ifs_string = f"{can_ifs_string}{can_if}:{baudrate} kBit/s\n"
		can_ifs_string = can_ifs_string[:-1]
		send(chr(commandnmbr) + chr(commands.INIT_CAN_SETTINGS)+can_ifs_string)

	
	#change the baudrate of a specified bus
	elif level1 ==commands.SET_CAN_BAUDRATE:
		#arg= "interface:baudrate(int):state(up or down)"
		arg = arg.split(":")
		path = "/etc/network/interfaces"
		search_string = f"iface {arg[0]} inet manual"
		interface_line = get_line(path, search_string)
		if interface_line is not False:
			with open(path, "r") as interfaces:
				file = interfaces.readlines()
			line = file[interface_line+1]
			line = line.split(" ")
			line[8] = arg[1]
			line = " ".join(line)
			file[interface_line+1] = line
			with open(path, "w") as interfaces:
				interfaces.writelines(file)
			if arg[2] == "up":
				subprocess.run(["ifdown", arg[0]])
				time.sleep(0.2)
				subprocess.run(["ifup", arg[0]])
		send(chr(commandnmbr) + chr(commands.SET_CAN_BAUDRATE))


	#monitors the bus load of all enabled can interfaces
	elif level1 == commands.CAN_BUS_LOAD:
		time.sleep(1)
		interfaces = arg.split(":")
		for i,interface in enumerate(interfaces):
			interfaces[i] = f"can{interface}@"+get_baudrate(interface)
		interfaces = [":".join(interfaces)]
		read_can_bus_load = not read_can_bus_load
		if read_can_bus_load:
			ts = threading.Thread(target=bus_load_thread, args=(interfaces))
			ts.start()

	#turn on or of a can interface
	elif level1 == commands.SET_CAN_STATE:
		read_can_bus_load = False
		arg = arg.split(":")
		if arg[1] == "true":
			subprocess.run(["ifup", arg[0]])
		else:
			subprocess.run(["ifdown", arg[0]])
		send(chr(commandnmbr) + chr(commands.SET_CAN_STATE))
			
#seperate thread to monitor the bus load
def bus_load_thread(interfaces):
	if len(interfaces) >1:
		interfaces = interfaces.split(":")
	busload = subprocess.Popen(["canbusload"]+interfaces, stdout=subprocess.PIPE, text=True)		
	while True:
		output = busload.stdout.readline()
		if busload.poll() is not None or read_can_bus_load == False or kill_threads == True:
			break
		if output:
			output_split = output.strip().split(" ")
			if len(output_split) > 1:
				interface = output_split[0].split("@")[0]
				load = output_split[-1]
				send(chr(commands.CAN_SETTINGS) + chr(commands.CAN_BUS_LOAD) + interface + ":" + load)
				time.sleep(0.1)

#get the baud rate of canx
def get_baudrate(x):
	path = "/etc/network/interfaces"
	search_string = f"iface can{x} inet manual"
	interface_line = get_line(path, search_string)
	if interface_line is not False:
		with open(path, "r") as interfaces:
			file = interfaces.readlines()
		line = file[interface_line+1]
		line = line.split(" ")
		return line[8]
	return "0"

##########################################################################################

#controller configuration

def controller_configuration(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	if level1 == commands.INIT_CONTROLLER_CONFIGURATION:
		try:
			with open("/usr/module-firmware/modules.txt", "r") as modules:
				info = modules.readline()
		except FileNotFoundError:
			send(chr(commandnmbr) + chr(level1) + "-\n") 
			return
		modules = info.split("\n")[0].split(":")
		firmwares = []
		module_types = []
		module_hw_versions = []
		for module in modules:
			if module:
				arr = module.split("-")
				module_types.append("-".join(arr[0:3]))
				module_hw_versions.append(arr[3])
				firmwares.append(module)
			else:
				module_types.append("-")
				module_hw_versions.append("-")
				firmwares.append("-")
		message_out = []
		# firmwares = list(dict.fromkeys(firmwares))
		message_out.append(":".join(firmwares))
		message_out.append(":".join(module_types))
		message_out.append(":".join(module_hw_versions))
		message_out = "\n".join(message_out)
		send(chr(commandnmbr) + chr(level1) + message_out)

	if level1 == commands.ACQUIRE_MODULE_INFORMATION:
		simulink_status = subprocess.run(["systemctl", "is-active", "go-simulink"], stdout=subprocess.PIPE, text=True)
		nodered_status = subprocess.run(["systemctl", "is-active", "nodered"], stdout=subprocess.PIPE, text=True)
		simulink_status = simulink_status.stdout
		nodered_status = nodered_status.stdout
		subprocess.run(["systemctl", "stop", "go-simulink"])
		subprocess.run(["systemctl", "stop", "nodered"])
		subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering.js"])	
		if not "in" in simulink_status:
			subprocess.run(["systemctl", "start", "go-simulink"])
		if not "in" in nodered_status:
			subprocess.run(["systemctl", "start", "nodered"])
		send(chr(commandnmbr) + chr(level1) + "done")

		
##########################################################################################

#module settings

def module_settings(commandnmbr, arg):
	level1 = ord(arg[0])
	arg = arg[1:]

	if level1 == commands.INIT_MODULE_SETTINGS:
		mod_type = arg.split(":")
		mod_slot = mod_type[1]
		mod_type = mod_type[0]
		available_firmwares = glob.glob("/usr/module-firmware/" + mod_type + "*.srec")
		with open("/usr/module-firmware/modules.txt", "r") as modules:
			info = modules.readline().split(":")
		current_firmware = info[int(mod_slot)-1]
		current_firmware = ".".join(current_firmware.split("-")[-3:])
		for i,firmware in enumerate(available_firmwares):
			firmware = firmware.split(".")[0]
			firmware = firmware.split("-")[-3:]
			available_firmwares[i] = ".".join(firmware)
		available_firmwares = list(dict.fromkeys(available_firmwares))
		send(chr(commandnmbr) + chr(level1) + ":".join(available_firmwares) + ":" + current_firmware)
		

	if level1 == commands.SET_NEW_FIRMWARE:
		simulink_status = subprocess.run(["systemctl", "is-active", "go-simulink"], stdout=subprocess.PIPE, text=True)
		nodered_status = subprocess.run(["systemctl", "is-active", "nodered"], stdout=subprocess.PIPE, text=True)
		simulink_status = simulink_status.stdout
		nodered_status = nodered_status.stdout
		subprocess.run(["systemctl", "stop", "go-simulink"])
		subprocess.run(["systemctl", "stop", "nodered"])
		error_array = []
		matching_modules = []
		new_firmware = arg
		with open("/usr/module-firmware/modules.txt", "r") as modules:
			info = modules.readline().split(":")
		module_hw_code = "-".join(new_firmware.split("-")[0:4])
		new_firmware_version = "-".join(new_firmware.split("-")[-3:]).split(".")[0]
		for i, mod in enumerate(info):
			if module_hw_code in mod:
				if new_firmware_version not in mod:
					matching_modules.append([i+1,new_firmware])
		number_of_updates = len(matching_modules)
		if number_of_updates > 0:
			with Pool() as p:
				results = p.map(upload_firmware, matching_modules)
				# print(results)
			for result in results:
				if "error" in result[1]:
					error_array.append(f"{result[0]}:{result[1][:-1]}")
			if len(error_array)>0:
				send(chr(commandnmbr) + chr(commands.ERROR_UPLOADING_FIRMWARE) + "\n".join(error_array))
			else:
				send(chr(commandnmbr) + chr(commands.NEW_FIRMWARE_UPLOAD_COMPLETE) + "done")
				subprocess.run(["node", "/usr/moduline/nodejs/module-info-gathering.js"])
		else:
			send(chr(commandnmbr) + chr(commands.NO_MODULES_TO_UPDATE) + "cancelled")
		if not "in" in simulink_status:
			subprocess.run(["systemctl", "start", "go-simulink"])
		if not "in" in nodered_status:
			subprocess.run(["systemctl", "start", "nodered"])

def upload_firmware(args):
	slot = args[0]
	new_firmware = args[1]
	stdout = subprocess.run(["node", "/usr/moduline/nodejs/upload-new-module-firmware.js", str(slot), new_firmware], stdout=subprocess.PIPE, text=True)
	return [slot, stdout.stdout]
		
##########################################################################################

#request enabled features by the app

def request_enabled_features(commandnmbr, arg):
	level1 = ord(arg[0])

	if level1 == commands.INIT_FEATURES:
		with open("/usr/moduline/python/rfcommServerConfig.py", "r") as features:
			features_arr = features.readlines()
		for i,feature in enumerate(features_arr):
			features_arr[i] = feature.split("=")[1]
		features = "".join(features_arr)
		features = features.lower()
		send(chr(commandnmbr) + features)


	elif level1 == commands.FEATURES_APROVED:
		send(chr(commands.VERIFY_DEVICE) + chr(commands.DEVICE_VERIFICATION_EXCHANGE_KEY))
		# if fe.UPDATE_CONTROLLER and trust_device:
		# 	update_controller(commands.UPDATE_CONTROLLER, chr(commands.CHECK_FOR_UPDATE))
		# elif not trust_device:
		# 	request_verification(commands.DEVICE_VERIFICATION_MISSING)
		
##########################################################################################

#reboot the controller

def reboot_controller():
	s.disconnect_client()
	global kill_threads_shutdown
	kill_threads_shutdown = True
	tf.join()
	subprocess.run(["reboot"])

##########################################################################################
#command_list
##########################################################################################

def command_list(byte, string):
	string = string.decode("utf-8")
	if byte == commands.VERIFY_DEVICE and fe.VERIFY_DEVICE:
		verify_device(byte, string)
		#request_verification
		return
	elif byte == commands.UPDATE_CONTROLLER and fe.UPDATE_CONTROLLER:
		update_controller(byte, string)
		return
	elif byte == commands.FILE_TRANSFER and fe.FILE_TRANSFER:
		file_transfer(byte, string)
		#receive_zip
		return
	elif byte == commands.ETHERNET_SETTINGS and fe.ETHERNET_SETTINGS:
		ethernet_settings(byte,string)
		return
	elif byte == commands.WIRELESS_SETTINGS and fe.WIRELESS_SETTINGS:
		wireless_settings(byte, string)
		return
	elif byte == commands.AP_SETTINGS and fe.AP_SETTINGS:
		access_point_settings(byte, string)
		return
	elif byte == commands.CONTROLLER_SETTINGS and fe.CONTROLLER_SETTINGS:
		controller_settings(byte, string)
		return
	elif byte == commands.CONTROLLER_PROGRAMS and fe.CONTROLLER_PROGRAMS:
		controller_programs(byte, string)
		return
	elif byte == commands.WWAN_SETTINGS and fe.WWAN_SETTINGS:
		wwan_settings(byte, string)
		return
	elif byte == commands.CAN_SETTINGS and fe.CAN_SETTINGS:
		can_settings(byte, string)
		#get_baudrate
		return
	elif byte == commands.CONTROLLER_CONFIGURATION and fe.CONTROLLER_CONFIGURATION:
		controller_configuration(byte, string)
		return
	elif byte == commands.MODULE_SETTINGS and fe.MODULE_SETTINGS:
		module_settings(byte, string)
		return
	elif byte == commands.REQUEST_ENABLED_FEATURES:
		request_enabled_features(byte, string)
		return
	elif byte == commands.REBOOT_CONTROLLER and fe.REBOOT_CONTROLLER:
		reboot_controller()
		return
	else:
		send(chr(commands.UNKNOWN_COMMAND) + "unknown command")

#undsoweiter


##########################################################################################
#bluetooth rfcomm server setup
##########################################################################################
		

#slightly expanded s.send function so not every command has to convert the string to bytes
def send(string):
	global message_received_timestamp
	print("out:")
	print(bytes(string, 'utf-8'))
	message_out_timestamp = time.time()
	try:
		print(f"message out {message_out_timestamp}, total elapsed time: {message_out_timestamp - message_received_timestamp} seconds")
	except NameError:
		print("first message, no timer available")
	s.send(bytes(string, 'utf-8'))

#function that gets called when the controller receives a message
def data_received(data):
	try:
		global message_received_timestamp
		message_received_timestamp = time.time()
		print(f"message received {message_received_timestamp}")
		global trust_device
		global transfer_mode
		first_byte = data[0]
		if (trust_device or first_byte == commands.VERIFY_DEVICE or first_byte == commands.REQUEST_ENABLED_FEATURES):
			if transfer_mode == "command":
				print(data)
				data = data[1:]
				#get message till stopbyte
				data = data.split(bytes([255]))[0]
				command_list(first_byte, data)
			elif fe.FILE_TRANSFER:
				receive_zip(data)
		else:
			send(chr(commands.VERIFY_DEVICE) + chr(commands.DEVICE_VERIFICATION_EXCHANGE_KEY))
	except Exception:
		error = "error:" + traceback.format_exc()
		send(chr(commands.SERVER_ERROR) + error)
		return

#function that gets called when a device connects to the server
def when_client_connects():
	global read_can_bus_load
	global tf
	global kill_threads
	global kill_threads_shutdown
	read_can_bus_load = False
	kill_threads = False
	kill_threads_shutdown = False
	try:
		with SMBus(2) as bus:
			bus.write_i2c_block_data(address,23,[255])
			bus.write_i2c_block_data(address,0,[64])
			tf = threading.Thread(target=status_led_gocontroll)
			tf.start()
	except:
		print("unable to send i2c message")
	global trust_device
	global transfer_mode
	transfer_mode = "command"
	trust_device = False
	connected_client = s.client_address
	print("connected to: " + connected_client)
	# with open("/etc/bluetooth/trusted_devices.txt", "r") as trusted_devices:
	# 	if (trusted_devices.read().find(connected_client) != -1):
	# 		trust_device = True
	request_enabled_features(commands.REQUEST_ENABLED_FEATURES, chr(commands.INIT_FEATURES))

#function that gets called when a device disconnects from the server
def when_client_disconnects():
	global kill_threads
	kill_threads=True
	print("connection lost")

#defines a variable which can be interacted with for bluetooth functions
#sets up callback functions and how the received/sent data is processed
s = BluetoothServer(data_received, True, "hci0", 1, None, False, when_client_connects, when_client_disconnects)
global address
address = 20 #address of the led driver on the i2c bus
ser = serial.Serial(port='/dev/ttymxc1', 
	baudrate=115200) #serial port for communicating with the modem

pause()
