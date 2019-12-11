
module.exports = function(RED) {
    "use strict";
	
    var can = require('socketcan');

    function CanReceiveNode(receiveNode) {
     RED.nodes.createNode(this,receiveNode);
       
	var node = this; 
	   
	/* Parse configuration as string from can config */
	node.canConfig = RED.nodes.getNode(receiveNode.canConfig);  
	   
	/* Parse the CAN ID to filter on */
	node.canid = parseInt(receiveNode.canid,16);
	   
	 /* Select the right CAN interface te listen on */
	if(node.canConfig.channel == "CAN 1")
	{
	node.channel = "can0";
	}
	else if(node.canConfig.channel == "CAN 2")
	{	
	node.channel = "can1";
	}	
	else
	{
	node.channel = "can0";
	}
	
	/* Create channel for socketcan */
	var channel;
	
	try {
		channel = can.createRawChannel(""+this.channel, true);
	}catch(ex) { 
		node.error("CAN not found:"+this.channel);		
	}
	
	/* Start receive routine */
	if(channel) 
	{
		
		channel.start();
		
		var canmsg={};
		
		channel.addListener("onMessage",function(frame) {
			node.warn("CAN receive ID: "+frame.id);
			node.warn("CAN filter ID: "+node.canid);
			
			if(frame.id != node.canid){return;}
			//canmsg.channel=frame.channel;
			canmsg.canid=frame.id;
			canmsg.dlc=frame.data.length;
			canmsg.rtr=frame.rtr;
			canmsg.data=frame.data;
			canmsg.payload=frame.id+"#"+frame.data;
			node.send(canmsg);
		});
	        
			this.on("close", function() {
		    channel.stop();
	        });	
	}
    }
    RED.nodes.registerType("CAN-Receive",CanReceiveNode);
}
