
module.exports = function(RED) {
   "use strict";
   function CanInterfaceNode(can) {
	RED.nodes.createNode(this,can);
	this.channel = can.channel;
	this.speed =can.speed;
   }
   RED.nodes.registerType("CAN-Interface",CanInterfaceNode);
}

