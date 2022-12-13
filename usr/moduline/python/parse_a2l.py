from pyuio import asap_datatypes
import json

reached_end = False
reading_parameter = False
reading_signal = False
parameters = {}
signals = {}
size = 1

with open("/usr/simulink/gocontroll.a2l", "r") as a2l:
    while not reached_end:
        line = a2l.readline()
        if reading_parameter or reading_signal:
            if "Name" in line:
                # print(line)
                # print(line.split(" "))
                if reading_parameter:
                    name = line.split(" ")[-3]
                else:
                    name = line.split(" ")[-1][:-1]
                # print(name)
            elif "ECU" in line:
                # print(line)
                # print(line.split(" "))
                if reading_parameter:
                    address = int(line.split(" ")[-2],16)
                else:
                    address = int(line.split(" ")[-1][:-1],16)
                # print(address)
            elif "Conversion" in line:
                # print(line)
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
                # print(dataType)
            elif "NUMBER" in line:
                # print(line)
                # print(line.split(" "))
                size = int(line.split(" ")[-1][:-1])
                # print(size)
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
        elif "/begin" in line:
            if "CHARACTERISTIC" in line:
                reading_parameter=True
            elif "MEASUREMENT" in line:
                reading_signal=True
            elif "COMPU_METHOD" in line:
                reached_end=True

json_parameters = json.dumps(parameters, indent=4)
with open("/usr/simulink/parameters.json", "w") as parameterFile:
    parameterFile.write(json_parameters)
with open("/usr/node-red-static/parameters.json", "w") as parameterFile:
    parameterFile.write(json_parameters)
json_signals = json.dumps(signals, indent=4)
with open("/usr/simulink/signals.json", "w") as signalFile:
    signalFile.write(json_signals)
with open("/usr/node-red-static/signals.json", "w") as signalFile:
    signalFile.write(json_signals)
print("a2l file parsed succesfully!")
# print(json_parameters)
# print(json_signals)