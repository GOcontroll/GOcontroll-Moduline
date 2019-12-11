module.exports = function(RED) {
    "use strict"
	
	var can = require("socketcan");

	function GOcontrollCanSend(sendNode) { 	 
	   RED.nodes.createNode(this,sendNode);
	     
	/* Parse string from the interface to use */
	this.canConfig = RED.nodes.getNode(sendNode.canConfig);
	
	if(this.canConfig == "CAN 1")
	{
	this.channel = "can0";
	}
	else if(this.canConfig == "CAN 2")
	{	
	this.channel = "can1";
	}
	else
	{	
	this.channel = "can0";
	}
	
	if(sendNode.canidtype == "standard")
	{
		this.extended = false;
	}
	else
	{
		this.extended = true;
	}
	
	this.canid = parseInt(sendNode.canid,16)

	this.dlc = parseInt(sendNode.candlc,10)
	
	var node = this;
	   
	   
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
		frame.canid= this.canid;
		frame.dlc =	this.dlc;  
		   
		 node.warn("CANID: "+frame.canid);
		  node.warn("CANDLC: "+frame.dlc);
		   
	
		//frame.canid=parseInt(msg.payload.split("#")[0]);
		//frame.data=new Buffer(msg.payload.split("#")[1]);
		frame.data=new Buffer(msg.payload);
		frame.dlc=frame.data.length;
		
		
		
		channel.send({ id: frame.canid,
		ext: this.extended,
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