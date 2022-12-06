const { exit, pid } = require("process");

module.exports = function(RED) {
"use strict"

const uiojs = require("uiojs");
const shell = require("shelljs");

function GOcontrollReadSimulink(config) {
    RED.nodes.createNode(this,config);
    let simulink = false;
    let res
    var intervalRead,intervalCheck = null;
    var node = this;
    const sampleTime = config.sampleTime;
    const outputKey = config.KeyOut;
    const Signal = JSON.parse(config.Signal);
    let asap_signal = new uiojs.asap_element(Signal.address, Signal.type, Signal.size);
    var msgOut={};
  
    let pid = "";
    let pid1 = "";
    let pid2 = "";

    intervalCheck = setInterval(check_model,2000);
    
    

    //Check if the simulink model is running and get its PID
    function check_model() {
        console.log("checking if model is running.")
        pid1 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
        pid1 = pid1.stdout.split("\n")[0];
        pid2 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
        pid2 = pid2.stdout.split("\n")[0];
        if (pid1==pid2){
            pid = pid1;
            simulink = true;
            intervalRead = setInterval(readSignal, parseInt(sampleTime));
            clearInterval(intervalCheck);
            console.log("model is running")
        }
    }

    //Read the signal from the found pid
    function readSignal() {
        console.log("reading signal"+simulink)
        if (simulink == true){
            try{
                res = uiojs.process_read(parseInt(pid), asap_signal);
                msgOut={[outputKey]:res};
                node.send(msgOut);  
            } catch(err) {
                simulink = false;
            }
        } else {
            intervalCheck = setInterval(check_model,2000);
            clearInterval(intervalRead);
        }
    }

    node.on('close', function(done) {
        clearInterval(intervalRead);
        clearInterval(intervalCheck);
        done();
    })

}

RED.nodes.registerType("Read-Simulink-Signal",GOcontrollReadSimulink);
}
