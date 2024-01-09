from pyuio import asap_datatypes
from json import dumps as dump_json
from subprocess import run
from glob import glob
from os import path

reached_end = False
reading_parameter = False
reading_signal = False
reading_header = False
parameters = {}
signals = {}
header = {}
size = 1

a2lLoc = glob("/usr/simulink/*.a2l")

try:
	a2lLoc = max(a2lLoc, key=path.getctime)
except:
	print("No a2l file present in /usr/simulink")
	exit()


with open(a2lLoc, "r") as a2l:
	while not reached_end:
		line = a2l.readline()

		if reading_header:

			#get address
			if "ADDR_EPK" in line:
				address = int(line.split("x")[1],16)
				if address == 0:
					reading_header = False #if the a2l is not made with the updated post processing function stop trying to read the header
				continue

			#get the XCP identifier
			elif "EPK" in line:
				value = line.split('\"')[1]
				continue

			#get the string length and save information
			elif "XcpStationID string length" in line:
				header = {
					'address':address,
					'type': asap_datatypes.uint8,
					'size': int(line.split('\"')[-2]),
					'value': value
				}
				reading_header = False

		elif reading_parameter or reading_signal:

			#get name
			if "Name" in line:
				if reading_parameter:
					name = line.split(" ")[-3]
				else:
					name = line.split(" ")[-1][:-1]
				continue

			#get address
			elif "ECU" in line:
				if reading_parameter:
					address = int(line.split(" ")[-2],16)
				else:
					address = int(line.split(" ")[-1][:-1],16)
				continue

			#get datatype
			elif "Conversion" in line:
				if "CM_double" in line:
					dataType = asap_datatypes.double
				elif "CM_single" in line:
					dataType = asap_datatypes.single
				elif "CM_uint32" in line:
					dataType = asap_datatypes.uint32
				elif "CM_int32" in line:
					dataType = asap_datatypes.int32
				elif "CM_uint16" in line:
					dataType = asap_datatypes.uint16
				elif "CM_int16" in line:
					dataType = asap_datatypes.int16
				elif "CM_uint8" in line:
					dataType = asap_datatypes.uint8
				elif "CM_int8" in line:
					dataType = asap_datatypes.int8
				elif "CM_uint64" in line:
					dataType = asap_datatypes.uint64
				elif "CM_int64" in line:
					dataType = asap_datatypes.int64
				elif "CM_boolean" in line:
					dataType = asap_datatypes.boolean
				continue

			#get arraysize
			elif "NUMBER" in line or "ARRAY_SIZE" in line:
				size = int(line.split(" ")[-1][:-1])
				continue

			#save information
			elif "/end" in line:
				if reading_parameter:
					parameters[name] = {
						'address':address,
						'type':dataType,
						'size': size
					}
					reading_parameter=False

				elif reading_signal:
					signals[name] = {
						'address':address,
						'type':dataType,
						'size': size
					}
					reading_signal=False

				size =1
				continue

		#check if an important datafield is starting
		elif "/begin" in line:
			if "CHARACTERISTIC" in line:
				reading_parameter=True
			elif "MEASUREMENT" in line:
				reading_signal=True
			elif "COMPU_METHOD" in line:
				reached_end=True
			elif "MOD_PAR" in line:
				reading_header=True

json_parameters = dump_json(dict(sorted(parameters.items())), indent=4)
with open("/usr/simulink/parameters.json", "w") as parameterFile:
	parameterFile.write(json_parameters)
run(["cp", "/usr/simulink/parameters.json", "/usr/node-red-static/parameters.json"])
json_signals = dump_json(dict(sorted(signals.items())), indent=4)
with open("/usr/simulink/signals.json", "w") as signalFile:
	signalFile.write(json_signals)
run(["cp", "/usr/simulink/signals.json", "/usr/node-red-static/signals.json"])

json_header = dump_json(dict(sorted(header.items())), indent=4)
with open("/usr/simulink/header.json", "w") as headerFile:
	headerFile.write(json_header)

print("a2l file parsed succesfully!")