const { exit, pid } = require("process");

module.exports = function(RED) {
"use strict"

const uiojs = require("uiojs");
const shell = require("shelljs");

function GOcontrollReadSimulink(config) {
    RED.nodes.createNode(this,config);
    let res
    var interval = null;
    var node = this;
    const sampleTime = config.sampleTime;
    const outputKey = config.KeyOut;
    const Signal = JSON.parse(config.Signal);
    let asap_signal = new uiojs.asap_element(Signal.address, Signal.type, Signal.size);
    var msgOut={};
  
    let pid = "";
    let pid1 = "";
    let pid2 = "";
    pid1 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
    pid1 = pid1.stdout.split("\n")[0];
    pid2 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
    pid2 = pid2.stdout.split("\n")[0];
    if (pid1==pid2){
        pid = pid1;
    }

    interval = setInterval(readSignal, parseInt(sampleTime));

    function readSignal() {
        res = uiojs.process_read(parseInt(pid), asap_signal);
        msgOut={[outputKey]:res};
        node.send(msgOut);
    }

    node.on('close', function(done) {
        clearInterval(interval);
        done();
    })

}

RED.nodes.registerType("Read-Simulink-Signal",GOcontrollReadSimulink);
}
