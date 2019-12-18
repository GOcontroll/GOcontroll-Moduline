
module.exports = function(RED) {
    "use strict";
	
    var can = require('socketcan');

    function CanReceiveNode(receiveNode) {
     RED.nodes.createNode(this,receiveNode);
       
	var node = this; 
	
	/* Parse configuration as string from can config */
	const canChannel = receiveNode.caninterface;  
	   
	/* Parse the CAN ID to filter on */
	const canid = parseInt(receiveNode.canid,16);
	
	/* Parse the CAN DLC for the number of bytes */
	const signals = parseInt(receiveNode.signals);
	var dlc = 0;
	
	/* Parse the dkey of the different messages */
	var key={};
	key[0] = receiveNode.key1;
	key[1] = receiveNode.key2;
	key[2] = receiveNode.key3;
	key[3] = receiveNode.key4;
	key[4] = receiveNode.key5;
	key[5] = receiveNode.key6;
	key[6] = receiveNode.key7;
	key[7] = receiveNode.key8;
	
	/* Parse the start byte from each signal */
	var sb={};
	sb[0] = parseInt(receiveNode.sb1,10);
	sb[1] = parseInt(receiveNode.sb2,10);
	sb[2] = parseInt(receiveNode.sb3,10);
	sb[3] = parseInt(receiveNode.sb4,10);
	sb[4] = parseInt(receiveNode.sb5,10);
	sb[5] = parseInt(receiveNode.sb6,10);
	sb[6] = parseInt(receiveNode.sb7,10);
	sb[7] = parseInt(receiveNode.sb8,10);
	
	/* Parse the end byte from each signal */
	var eb={};
	eb[0] = parseInt(receiveNode.eb1,10);
	eb[1] = parseInt(receiveNode.eb2,10);	
	eb[2] = parseInt(receiveNode.eb3,10);
	eb[3] = parseInt(receiveNode.eb4,10);
	eb[4] = parseInt(receiveNode.eb5,10);
	eb[5] = parseInt(receiveNode.eb6,10);
	eb[6] = parseInt(receiveNode.eb7,10);
	eb[7] = parseInt(receiveNode.eb8,10);
	
	/* Make variabele to store values in */
	var value = {};   
  
  	var canInterface = "can0";
	if(canChannel == "CAN 1"){canInterface = "can0";}
	else if (canChannel == "CAN 2"){canInterface = "can1";}
  
	/* Create channel to communicate on */
	var channel;
	try {
		channel = can.createRawChannel(""+canInterface, true);
	}catch(ex) { 
		node.error("CAN not found:"+canInterface);		
	} 
	
	/* Check parameters */
	var error = 0;
	for(var s = 0; s < signals; s++)
	{
		if(sb[s] > dlc){dlc = sb[s];}
		if(eb[s] > dlc){dlc = eb[s];}
		
		if(key[s] == ""){node.error("Key for signal "+i+" not given");}
		
		if(sb[s] < 0){node.error("Start byte from signal "+key[s]+" is negative!");error = 1;}
		if(sb[s] > 8){node.error("Start byte from signal "+key[s]+" is out of range!");error = 1;}
		if(eb[s] < 0){node.error("End byte from signal "+key[s]+" is negative!");error = 1;}
		if(eb[s] > 8){node.error("End byte from signal "+key[s]+" is out of range!");error = 1;}
		
			for(var sc = 0; sc < signals; sc++)
			{
				if(s == sc){continue;}
				
				if(sb[s] == sb[sc]){node.error("Start byte from signal "+key[s]+" has overlap with start byte from signal "+key[sc]);error = 1;}
				if(sb[s] == eb[sc]){node.error("Start byte from signal "+key[s]+" has overlap with end byte from signal "+key[sc]);error = 1;}
				if(eb[s] == sb[sc]){node.error("End byte from signal "+key[s]+" has overlap with start byte from signal "+key[sc]);error = 1;}
				if(eb[s] == eb[sc]){node.error("End byte from signal "+key[s]+" has overlap with end byte from signal "+key[sc]);error = 1;}
			}
	}

	/* Start receive routine */
	if(channel) 
	{
		
		channel.start();
		
		var msgOut={};
		
		channel.addListener("onMessage",function(frame) {
			/* Exit function if message is not matched with identifier */ 
			node.warn("message received");
			node.warn(frame.id);
			if(frame.id != canid){return;}
			
			
			if(error == 1){node.error("Probably wrong node configuration, check your configuration and deploy");return;}
			
			if(frame.data.length < dlc){ node.warn("Received CAN message("+frame.data.length+" bytes)is smaller than expected("+dlc+" bytes)");return;}
			if(frame.data.length > dlc){ node.warn("Received CAN message("+frame.data.length+" bytes)is bigger than expected("+dlc+" bytes)");return;}
			
			/* Load some information about the message */
			msgOut["dlc"]= frame.data.length;
			msgOut["rtr"]= frame.rtr;

				for(var s=0; s<signals; s++)
				{

					
					/* Check if message uses single byte */
					if((sb[s]-eb[s]) == 0)
					{
					value[s] = frame.data.readUInt8(sb[s]-1);	
					}
					else
					{
						/* Check endianess */
						/* In case big endian */
						if(sb[s]<eb[s])
						{
							if((eb[s]-sb[s]) == 1)
							{
							value[s] = frame.data.readUInt16BE(sb[s]-1);
							}
							if((eb[s]-sb[s]) == 3)
							{
							value[s] = frame.data.readUInt32BE(sb[s]-1);	
							}
						}
						/* In case little endian */
						else
						{
							if((sb[s]-eb[s]) == 1)
							{
							value[s] = frame.data.readUInt16LE(eb[s]-1);
							}
							if((sb[s]-eb[s]) == 3)
							{
							value[s] = frame.data.readUInt32LE(eb[s]-1);	
							}	
						}
					}
					
				msgOut[key[s]]= value[s];
				}			
			node.send(msgOut);
		});

        
		this.on("close", function() {
		channel.stop();
	    });		
	}
	
	}
    
    RED.nodes.registerType("CAN-Receive",CanReceiveNode);
}
