from smbus2 import SMBus
address = 20
with SMBus(2) as bus:
	bus.write_i2c_block_data(address,23,[255])
	bus.write_i2c_block_data(address,0,[64])
	# bus.write_i2c_block_data(address, 0x0D, [0])
	# bus.write_i2c_block_data(address, 0x0B, [165])
	# bus.write_i2c_block_data(address, 0x0C, [50])
	bus.write_i2c_block_data(address, 0x0D, [127])
