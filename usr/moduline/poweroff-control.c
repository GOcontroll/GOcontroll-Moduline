#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <unistd.h>

#include <linux/i2c-dev.h>
#include <sys/ioctl.h>


#define LOW 0
#define MS *1000

#define MODULINE 4


typedef struct{
	uint16_t BatteryVoltage;
	uint16_t Active1Voltage;
	#if (MODULINE != 3)
	uint16_t Active2Voltage;
	uint16_t Active3Voltage;
	#endif
} _supplyVoltage;


static uint16_t GocontrollModuline_GetSupplyVoltage(_supplyVoltage *supplyVoltage);
static uint8_t GocontrollModuline_GetPowerOffTimeout(void);

void main (void)
{

	static _supplyVoltage supplyVoltage;
	static uint8_t timer = 0;
	static uint8_t timeout = 0; 
	timeout = GocontrollModuline_GetPowerOffTimeout();
    
	while(1)
    {
	GocontrollModuline_GetSupplyVoltage(&supplyVoltage);
	#if (MODULINE != 3)
	if((supplyVoltage.Active1Voltage < 100) && (supplyVoltage.Active2Voltage < 100) && (supplyVoltage.Active3Voltage < 100))
	#else
	if(supplyVoltage.Active1Voltage < 100)	
	#endif
	{
		if(timer++ >= timeout)
		{
		system("reboot");
		}
	}
	else
	{
	timer = 0;
	}
	//printf("timer: %d\n",timer);
	usleep(1000 MS);
	}
}

/************************************************************************************//**
** \brief     Configures and provides the SPI busses
** \param     none.
** \return    0 if ok -1 if  failed
**
****************************************************************************************/
static uint16_t GocontrollModuline_GetSupplyVoltage(_supplyVoltage *supplyVoltage)
{
	static uint8_t dataTx[3] = {0};
	static uint8_t dataRx[3] = {0};
	
	static uint16_t batteryTemp = 0;
	static uint16_t active1Temp = 0;
	#if (MODULINE != 3)
	static uint16_t active2Temp = 0;
	static uint16_t active3Temp = 0;

	static int i2cDevice = 0;
	static float decimalFactor = 4.095 / 2047;

    const int addr 			= 0x48;       
	const int setup 		= 0x01;
	const int convert 		= 0x00;
	const int convert0 		= 0xC3; /* battery voltage */
	const int convert1 		= 0xD3; /* active 1 voltage */
	const int convert2 		= 0xE3; /* active 2 voltage */
	const int convert3 		= 0xF3; /* active 3 voltage */
	const int convertGen 	= 0x83;
	#else
	static int i2cDevice = 0;
	static float decimalFactor = 3.34 / 4095;

    const int addr 			= 0x36;       
	const int setup 		= 0xA2;
	const int convert1 		= 0x61; /* contact voltage */
	const int convert0 		= 0x63; /* battery voltage */

	#endif

	/* first setup of the I2C bus and device */  
	if(i2cDevice == 0)
	{
		static char dataTx[3] ={0};
		
		/* Open I2C device */
		#if (MODULINE != 3)
		if ((i2cDevice = open("/dev/i2c-2",O_RDWR)) < 0) {
        #else
		if ((i2cDevice = open("/dev/i2c-1",O_RDWR)) < 0) {	
		#endif
		
		printf("Failed to open the bus.");
		}
		
		/* Aquire bus acces */
		if (ioctl(i2cDevice,I2C_SLAVE,addr) < 0) {
        printf("Failed to acquire bus access and/or talk to slave.\n");
		}
	}
	
	
	
	#if (MODULINE != 3)
	
		/* Configure the ADC device */ 
		dataTx[0] = setup;
		dataTx[1] = convert0;
		dataTx[2] = convertGen;
		/* Send actual data */
		if (write(i2cDevice,dataTx,3) != 3) {
			printf("Failed to write to the i2c bus.\n");
		}
		
		/* Send converion command */
		dataTx[0] = convert;
		dataTx[1] = 0xff;	
		write(i2cDevice,dataTx,1);
		
		/* Read data from device */
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		batteryTemp = (dataRx[0]<<4) | ((dataRx[1] & 0xf0)>>4);
		
		if(batteryTemp > 2047){
		batteryTemp = 0;
		}
		
		/* Convert data to actual value */
		supplyVoltage->BatteryVoltage = (uint16_t) ((float)(((batteryTemp * decimalFactor)/1.5)*11700));
		
		/* Configure the ADC device */ 
		dataTx[0] = setup;
		dataTx[1] = convert1;
		dataTx[2] = convertGen;
		/* Send actual data */
		if (write(i2cDevice,dataTx,3) != 3) {
			printf("Failed to write to the i2c bus.\n");
		}
		
		/* Send converion command */
		dataTx[0] = convert;
		dataTx[1] = 0xff;	
		write(i2cDevice,dataTx,1);
		
		/* Read data from device */
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		/* Convert data to actual value */
		active1Temp = (dataRx[0]<<4) | ((dataRx[1] & 0xf0)>>4);
		
		if(active1Temp > 2047){
		active1Temp = 0;
		}
		
		supplyVoltage->Active1Voltage = (uint16_t) ((float)(((active1Temp * decimalFactor)/1.5)*11700));
		
				/* Configure the ADC device */ 
		dataTx[0] = setup;
		dataTx[1] = convert2;
		dataTx[2] = convertGen;
		/* Send actual data */
		if (write(i2cDevice,dataTx,3) != 3) {
			printf("Failed to write to the i2c bus.\n");
		}
		
		/* Send converion command */
		dataTx[0] = convert;
		dataTx[1] = 0xff;	
		write(i2cDevice,dataTx,1);
		
		/* Read data from device */
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		active2Temp = (dataRx[0]<<4) | ((dataRx[1] & 0xf0)>>4);
		
		if(active2Temp > 2047){
		active2Temp = 0;
		}
		
		/* Convert data to actual value */
		supplyVoltage->Active2Voltage = (uint16_t) ((float)(((active2Temp * decimalFactor)/1.5)*11700));
		
				/* Configure the ADC device */ 
		dataTx[0] = setup;
		dataTx[1] = convert3;
		dataTx[2] = convertGen;
		/* Send actual data */
		if (write(i2cDevice,dataTx,3) != 3) {
			printf("Failed to write to the i2c bus.\n");
		}
		
		/* Send converion command */
		dataTx[0] = convert;
		dataTx[1] = 0xff;	
		write(i2cDevice,dataTx,1);
		
		/* Read data from device */
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		active3Temp = (dataRx[0]<<4) | ((dataRx[1] & 0xf0)>>4);
		
		if(active3Temp > 2047){
		active3Temp = 0;
		}
		
		/* Convert data to actual value */
		supplyVoltage->Active3Voltage = (uint16_t) ((float)(((active3Temp * decimalFactor)/1.5)*11700));
		
	#else

		dataTx[0] = convert0;
		dataTx[1] = 0xff;

		write(i2cDevice,dataTx,1);
		
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		batteryTemp = (dataRx[1] | ((dataRx[0] & 0x0f)<<8));
		supplyVoltage->BatteryVoltage = (uint16_t)((float)((batteryTemp * decimalFactor)/1.5)*11700);
		


		dataTx[0] = convert1;
		dataTx[1] = 0xff;

		write(i2cDevice,dataTx,1);
		
		if (read(i2cDevice,dataRx,2) != 2) {
			printf("Failed to read from the i2c bus.\n");
		}
		
		active1Temp = (dataRx[1] | ((dataRx[0] & 0x0f)<<8));
		supplyVoltage->Active1Voltage = (uint16_t)((float)((active1Temp * decimalFactor)/1.5)*11700);


	#endif
		
	//	printf("Battery is: %d\n", supplyVoltage->BatteryVoltage);
	//	printf("Active 1 is: %d\n", supplyVoltage->Active1Voltage);
	//	printf("Active 2 is: %d\n", supplyVoltage->Active2Voltage);
	//	printf("Active 3 is: %d\n", supplyVoltage->Active3Voltage);
		
return 0;
}


/***************************************************************************************
** \brief	Function that stores and provides the memory locations for each module
** \		data holder.
** \param	Module slot on which the module is installed to. Value from 1 to 8
** \return	If requested, the memory location of the modules data holder.
**
****************************************************************************************/
static uint8_t GocontrollModuline_GetPowerOffTimeout(void)
{
	int fileId = 0;

	if((fileId = open("/usr/moduline/poweroff.timeout", O_RDONLY | O_NONBLOCK)) <= 0)
	{
	/* Here means the file is not opend properly */
	/* To be sure it is closed, force a close */
	close(fileId);
	return 5;
	}
	
	/* If we are here, we have acces to a valid file */	
	char tempValue[15] = {0};	
	/* Read the content of the file */
	read(fileId, &tempValue[0], 15); 
	/* Close the file descriptor */
	close(fileId);
	/* Write the content as a float and return*/
	return (uint8_t) strtof(tempValue, NULL);
}