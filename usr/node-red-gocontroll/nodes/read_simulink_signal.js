const { exit, pid } = require("process");

module.exports = function(RED) {
"use strict"

const uiojs = require("uiojs");
const shell = require("shelljs");
const fs = require("fs");

function GOcontrollReadSimulink(config) {
    RED.nodes.createNode(this,config);
    let simulink = false;
    let res, Signal, asap_signal, SignalFile;
    var intervalRead,intervalCheck = null;
    var node = this;
    const sampleTime = config.sampleTime;
    const outputKey = config.KeyOut;
    const SignalName = config.Signal;
    var msgOut={};
    let pid = "";
    let pid1 = "";
    let pid2 = "";
    node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})

    intervalCheck = setInterval(check_model,2000);
    
    

    //Check if the simulink model is running and get its PID
    function check_model() {
        pid1 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
        pid1 = pid1.stdout.split("\n")[0];
        pid2 = shell.exec("ps -ef|grep gocontroll.elf | awk {'print $2'}");
        pid2 = pid2.stdout.split("\n")[0];
        if (pid1==pid2){
            pid = parseInt(pid1);
            simulink = true;
            try{
                //check if the address or size of the signal has changed due to a recompilation of the model
                SignalFile = fs.readFileSync("/usr/simulink/signals.json");
                Signal = JSON.parse(SignalFile);
                //get the desired signal from the list of signals
                Signal = findValueByPrefix(Signal, SignalName);
                asap_signal = new uiojs.asap_element(Signal.address, Signal.type, Signal.size);
            } catch(err) {
                console.log(err);
                return;
            }
            intervalRead = setInterval(readSignal, parseInt(sampleTime));
            clearInterval(intervalCheck);
            console.log("simulink model started")
            node.status({fill:"green",shape:"dot",text:"Reading " + SignalName});
        } else {
            node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
        }
    }

    //Read the signal from the found pid
    function readSignal() {
        if (simulink == true){
            try{
                res = uiojs.process_read(pid, asap_signal);
                msgOut={[outputKey]:res};
                node.send(msgOut);  
            } catch(err) {
                simulink = false;
            }
        } else {
            intervalCheck = setInterval(check_model,2000);
            clearInterval(intervalRead);
            console.log("simulink model stopped")
            node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
        }
    }

    function findValueByPrefix(object, prefix) {
        for (var property in object) {
            if (object.hasOwnProperty(property) && 
            property.toString().startsWith(prefix)) {
            return object[property];
            }
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
