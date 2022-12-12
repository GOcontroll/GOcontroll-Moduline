const { exit } = require("process");

module.exports = function(RED) {
"use strict"

const uiojs = require("uiojs");
const shell = require("shelljs");
const fs = require("fs");

function GOcontrollReadSimulink(config) {
    RED.nodes.createNode(this,config);
    var node = this;
    node.send(config)

    let simulink = false;
    let res, Signal, SignalFile;
    var asap_signals = [];
    var intervalRead,intervalCheck = null;
    const sampleTime = config.sampleTime;
    const Signals = config.signals.split(",")
    console.log(Signals)
    var msgOut={};
    let pid = "";
    let pid1 = "";
    let pid2 = "";
    if (!Signals) {
        node.warn("No signals were selected, exiting")
        exit(-1)
    }
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
                var localSignals = JSON.parse(SignalFile);
                for (const sig in Signals) {
                    //get the desired signal from the list of signals
                    Signal = findValueByPrefix(localSignals, Signals[sig]);
                    if (Signal){
                        asap_signals.push(new uiojs.asap_element(Signal.address, Signal.type, Signal.size));
                    } else {
                        throw new Error("The selected signal could not be found in signals.json");
                    }
                }
            } catch(err) {
                node.warn(err);
                node.status({fill:"red", shape:"dot", text:"An error occured reading signals.json"});
                return;
            }
            intervalRead = setInterval(readSignal, parseInt(sampleTime));
            clearInterval(intervalCheck);
            console.log("simulink model started")
            node.status({fill:"green",shape:"dot",text:"Reading Selected signals"});
        } else {
            node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
        }
    }

    //Read the signal from the found pid
    function readSignal() {
        if (simulink == true){
            try{
                for (const asap_signal in asap_signals){
                    res = uiojs.process_read(pid, asap_signals[asap_signal]);
                    msgOut[Signals[asap_signal]] = res;
                }
                node.send(msgOut);  
            } catch(err) {
                simulink = false;
                console.log(err);
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
        return false;
    }

    node.on('close', function(done) {
        clearInterval(intervalRead);
        clearInterval(intervalCheck);
        done();
    })

}

RED.nodes.registerType("Read-Simulink-Signal",GOcontrollReadSimulink);
}
