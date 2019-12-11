
module.exports = function(RED) {
   "use strict";
   function CanConfigNode(n) {
	RED.nodes.createNode(this,n);
	this.channel = n.channel;
	this.bitrate =n.bitrate;
   }
   RED.nodes.registerType("canconfig",CanConfigNode);

}

