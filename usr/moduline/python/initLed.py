import sys

args = sys.argv[1:]
try:
	mode = int(args[0])
except:
	mode = 1



from smbus2 import SMBus
address = 20
try:
	with SMBus(2) as bus:
		bus.write_i2c_block_data(address,23,[255])
		bus.write_i2c_block_data(address,0,[64])
		if mode==1:
			bus.write_i2c_block_data(address, 0x0D, [0])
			bus.write_i2c_block_data(address, 0x0B, [165])
			bus.write_i2c_block_data(address, 0x0C, [50])
		elif mode==0:
			bus.write_i2c_block_data(address, 0x0D, [0])
			bus.write_i2c_block_data(address, 0x0B, [0])
			bus.write_i2c_block_data(address, 0x0C, [0])
		else:
			print("invalid argument entered, enter 1 or 0")
		# bus.write_i2c_block_data(address, 0x0D, [127])
except:
	print("No i2c bus to control the LEDs present.")