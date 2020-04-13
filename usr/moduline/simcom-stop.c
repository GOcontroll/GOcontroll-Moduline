#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <unistd.h>

#define LOW 0
#define MS *1000

static int GocontrollModuline_Sim7000Ldo(uint8_t state);
static int GocontrollModuline_Sim7000Pwr(uint8_t state);
static int GocontrollModuline_Sim7000Rst(uint8_t state);

void main (void)
{
	/* switch off all SIM7000 controls */
	printf("Stop SIMCOM module\n");
	GocontrollModuline_Sim7000Ldo(0);
	GocontrollModuline_Sim7000Rst(0);
	GocontrollModuline_Sim7000Pwr(0);
	
	return;
}



/************************************************************************************//**
** \brief     Control the SIM7000 LDO
** \param     none.
** \return    0 if ok -1 if  failed
**
****************************************************************************************/
static int GocontrollModuline_Sim7000Ldo(uint8_t state)
{

static int contactRelais = 0;
	
	if(contactRelais == 0)
	{
		char path[40];
			
		snprintf(path, 40, "/sys/class/leds/ldo-sim7000/brightness");
		
		contactRelais = open(path, O_WRONLY);
		
		if (-1 == contactRelais) {
		fprintf(stderr, "Failed to open gpio value for writing!\n");
		return(-1);
		}
	}
	

	static const char s_values_str[] = "01";
		
	if (1 != write(contactRelais, &s_values_str[LOW == state ? 0 : 1], 1)) {
		fprintf(stderr, "Failed to write value!\n");
		return(-1);
	}
	return(0);
}

/************************************************************************************//**
** \brief     Control the SIM7000 PWR
** \param     none.
** \return    0 if ok -1 if  failed
**
****************************************************************************************/
static int GocontrollModuline_Sim7000Pwr(uint8_t state)
{

static int contactRelais = 0;
	
	if(contactRelais == 0)
	{
		char path[40];
			
		snprintf(path, 40, "/sys/class/leds/pwr-sim7000/brightness");
		
		contactRelais = open(path, O_WRONLY);
		
		if (-1 == contactRelais) {
		fprintf(stderr, "Failed to open gpio value for writing!\n");
		return(-1);
		}
	}
	

	static const char s_values_str[] = "01";
		
	if (1 != write(contactRelais, &s_values_str[LOW == state ? 0 : 1], 1)) {
		fprintf(stderr, "Failed to write value!\n");
		return(-1);
	}
	return(0);
}

/************************************************************************************//**
** \brief     Control the SIM7000 RST
** \param     none.
** \return    0 if ok -1 if  failed
**
****************************************************************************************/
static int GocontrollModuline_Sim7000Rst(uint8_t state)
{

static int contactRelais = 0;
	
	if(contactRelais == 0)
	{
		char path[40];
			
		snprintf(path, 40, "/sys/class/leds/rst-sim7000/brightness");
		
		contactRelais = open(path, O_WRONLY);
		
		if (-1 == contactRelais) {
		fprintf(stderr, "Failed to open gpio value for writing!\n");
		return(-1);
		}
	}
	

	static const char s_values_str[] = "01";
		
	if (1 != write(contactRelais, &s_values_str[LOW == state ? 0 : 1], 1)) {
		fprintf(stderr, "Failed to write value!\n");
		return(-1);
	}
	return(0);
}