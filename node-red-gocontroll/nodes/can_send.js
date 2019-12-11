module.exports = function(RED) {
    "use strict"
	
	var can = require("socketcan");

	function GOcontrollCanSend(sendNode) { 	 
	   RED.nodes.createNode(this,sendNode);
	
	var node = this; 
	
	/* Parse configuration as string from can config */
	node.canConfig = RED.nodes.getNode(sendNode.canConfig);
	
	/* Parse the CAN ID to send */
	node.canid = parseInt(sendNode.canid,16);
	
	/* Parse the CAN DLC for the number of bytes */
	node.dlc = parseInt(sendNode.candlc,10)
	
	node.canidtype = sendNode.canidtype
	
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
	
	if(node.canidtype == "standard")
	{
	node.extendedid = false;
	}
	else
	{
	node.extendedid = true;
	}
	
	node.warn("CAN send on: "+this.channel);
	
	var channel;
	
	try {
		channel = can.createRawChannel(""+this.channel, true);
	}catch(ex) { 
		node.error("CAN not found:"+this.channel);		
	} 
	   
	   
	if(channel)
	{
		channel.start();   
	   var frame={};
	   
	   this.on('input', function (msg) {
		frame.canid= node.canid;
		frame.dlc =	node.dlc;  
		   
		 node.warn("CANID: "+frame.canid);
		 node.warn("CANDLC: "+frame.dlc);
		   
	
		//frame.canid=parseInt(msg.payload.split("#")[0]);
		//frame.data=new Buffer(msg.payload.split("#")[1]);
		frame.data=new Buffer(msg.payload);
		frame.dlc=frame.data.length;
		
		
		
		channel.send({ id: frame.canid,
		ext: node.extendedid,
		data:frame.data });
		   
	   });
	   
	   
	this.on("close", function() {
	channel.stop();
	});  
	}   
	   
	   
}


	RED.nodes.registerType("CAN-Send",GOcontrollCanSend);
/*
	    GOcontrollCanReceive.prototype.close = function() {
        if (this.interval_id != null) {
            clearInterval(this.interval_id);
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
        } else if (this.cronjob != null) {
            this.cronjob.stop();
            if (RED.settings.verbose) { this.log(RED._("inject.stopped")); }
            delete this.cronjob;
        }
    };
	*/
}