#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

#include <fcntl.h>
#include <unistd.h>


#define LOW 0


/************************************************************************************//**
** \brief     Function that controls the power active during shutdown event
** \param     none.
** \return    none.
**
****************************************************************************************/
void main (void)
{
	static int powerActive = 0;
	
	if(powerActive == 0)
	{
		char path[40];
			
		snprintf(path, 40, "/sys/class/leds/power-active/brightness");
		
		powerActive = open(path, O_WRONLY);
		
		if (-1 == powerActive) {
		}
	}
	

	static const char s_values_str[] = "01";
		
	if (1 != write(powerActive, &s_values_str[LOW == 0 ? 0 : 1], 1)) {

	}
}
