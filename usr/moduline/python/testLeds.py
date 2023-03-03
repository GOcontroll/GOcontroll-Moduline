#!/usr/bin/python3

from smbus2 import SMBus

from time import sleep

def clearLeds():
    bus.write_i2c_block_data(address,ledBaseAddress,[0]*12)

def reds():
    bus.write_byte_data(address, ledBaseAddress,64)
    bus.write_byte_data(address, ledBaseAddress+3,64)
    bus.write_byte_data(address, ledBaseAddress+6,64)
    bus.write_byte_data(address, ledBaseAddress+9,64)

def greens():
    bus.write_byte_data(address, ledBaseAddress+1, 64)
    bus.write_byte_data(address, ledBaseAddress+4, 64)
    bus.write_byte_data(address, ledBaseAddress+7, 64)
    bus.write_byte_data(address, ledBaseAddress+10, 64)

def blues():
    bus.write_byte_data(address, ledBaseAddress+2, 64)
    bus.write_byte_data(address, ledBaseAddress+5, 64)
    bus.write_byte_data(address, ledBaseAddress+8, 64)
    bus.write_byte_data(address, ledBaseAddress+11, 64)

def restoreLeds(ledstate):
    clearLeds()
    bus.write_i2c_block_data(address, ledBaseAddress, ledstate)

address = 0x14

ledBaseAddress = 0x0b

ledCount = 12

with SMBus(2) as bus:
    # get the old state
    oldLedstates = bus.read_i2c_block_data(address, ledBaseAddress, ledCount)
    # clear all the leds
    clearLeds()
    # turn on the red leds
    reds()
    sleep(2)
    clearLeds()
    greens()
    sleep(2)
    clearLeds()
    blues()
    sleep(2)
    restoreLeds(oldLedstates)



