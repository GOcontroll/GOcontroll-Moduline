module.exports = function(RED) {
"use strict"

const shell = require("shelljs");
const fs = require("fs");

function GOcontrollReadSimulink(config) {
    RED.nodes.createNode(this,config);
    var node = this;

    //import like this to catch the error if it is not installed on the controller.
    import("uiojs").then(uiojs=>{

    let simulink = false;
    let res, Signal, SignalFile;
    var asap_signals = [];
    var intervalRead,intervalCheck = null;
    const sampleTime = config.sampleTime;
    const Signals = config.signals.split(",")
    var msgOut={};
    let pid = "";
    if (!Signals) {
        node.warn("No signals were selected, exiting")
        exit(-1)
    }
    node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})

    intervalCheck = setInterval(check_model,2000);
    
    

    //Check if the simulink model is running and get its PID
    function check_model() {
        asap_signals = [];
        var pidof = shell.exec("pidof GOcontroll_Linux.elf");
        pid = pidof.stdout.split("\n")[0];
        if (!pidof.code){
            try{
                //check if the address or size of the signal has changed due to a recompilation of the model
                SignalFile = fs.readFileSync("/usr/simulink/signals.json");
            } catch(err) {
                node.warn("Error reading signals.json, trying to parse the file...");
                var parseResult = shell.exec("python3 /usr/moduline/python/parse_a2l.py")
                if (!parseResult.stdout.includes("succesfully")){
                    node.status({fill:"red", shape:"dot", text:"An error occured parsing gocontroll.a2l"});
                    exit(-1);
                }
                check_model();
                return;
            }
            var localSignals = JSON.parse(SignalFile);
            for (const sig in Signals) {
                //get the desired signal from the list of signals
                Signal = findValueByPrefix(localSignals, Signals[sig]);
                if (Signal){
                    asap_signals.push(new uiojs.asap_element(Signal.address, Signal.type, Signal.size));
                } else {
                    node.status({fill:"red", shape:"dot", text:"The selected signal could not be found in signals.json"});
                    exit(-1);
                }
            }
            pid = parseInt(pid);
            simulink = true;
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
    }).catch(err=>{
        node.status({fill:"red",shape:"dot",text:"could not load uiojs, module missing"});
        return;
    });
}

RED.nodes.registerType("Read-Simulink-Signal",GOcontrollReadSimulink);
}
