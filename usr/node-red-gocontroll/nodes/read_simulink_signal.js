const { asap_element } = require("uiojs");

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
    let header;
    var asap_signals = [];
    var intervalRead,intervalCheck = null;
    const sampleTime = config.sampleTime;
    const Signals = config.signals.split(",");
    const xcpIdCheck = config.xcpIdCheck;   //true == validate xcp station id, false == dont
    var msgOut={};
    var payload={};
    let pid = "";
    if (!Signals) {
        node.status({fill:"red",shape:"dot",text:"No signals were selected, exiting"})
        return
    }
    node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})

    if (!parseA2L()) {
        node.status({fill:"red", shape:"dot", text:"An error occured parsing GOcontroll_Linux.a2l"});
        return
    }

    intervalCheck = setInterval(check_model,2000);

    //Check if the simulink model is running and get its PID
    function check_model() {
        asap_signals = [];
        var pidof = shell.exec("pidof -s GOcontroll_Linux.elf");
        pid = pidof.stdout.split("\n")[0];
        if (!pidof.code){
            pid = parseInt(pid);
            if (xcpIdCheck){
                header = getHeader();
                if (header) {
                    if (!checkXCPidentifierMatch(pid, header)){
                        node.status({fill:"red", shape:"dot", text:"The XCP ID in the parsed a2l file does not match that of the running model!"})
                        return;
                    }
                }
            }

            var localSignals = getSignals();
            if (!localSignals){
                clearInterval(intervalCheck);
                return;
            }

            for (const sig in Signals) {
                //get the desired signal from the list of signals
                var signal = findValueByPrefix(localSignals, Signals[sig]);
                if (signal){
                    asap_signals.push(new uiojs.asap_element(signal.address, signal.type, signal.size));
                } else {
                    node.status({fill:"red", shape:"dot", text:Signals[sig] + " could not be found the list of available signals."});
                    node.error(Signals[sig] + " could not be found the list of available signals.")
                    return;
                }
            }
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
                    var res = uiojs.process_read(pid, asap_signals[asap_signal]);
                    payload[Signals[asap_signal]] = res;
                }
                payload["TimeStamp"] = Date.now()
                msgOut["payload"] = payload;
                node.send(msgOut);
            } catch(err) {
                // console.log(err);
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

    function getHeader() {
        try{
            //check if the address or size of the signal has changed due to a recompilation of the model
            var headerFile = fs.readFileSync("/usr/simulink/header.json");
            return JSON.parse(headerFile)
        } catch(err) {
            node.error("Error reading header.json.\nUpgrade your blockset to gain access to this new safety feature");
            return false
        }
    }

    function getSignals() {
        try{
            //check if the address or size of the signal has changed due to a recompilation of the model
            var signalFile = fs.readFileSync("/usr/simulink/signals.json");
        } catch(err) {
            if (parseA2L()){
                return getParams();
            } else {
                node.status({fill:"red", shape:"dot", text:"An error occured parsing GOcontroll_Linux.a2l"});
                return false;
            }
        }
        return JSON.parse(signalFile);
    }

    function checkXCPidentifierMatch (pid, header) {
        try {
            var xcpIdentifier = String.fromCharCode.apply(null, uiojs.process_read(pid, new uiojs.asap_element(header.address, header.type, header.size)))
        } catch (err) {
            node.error(err);
            return false
        }
        if (xcpIdentifier!=header.value){
            node.error("cached xcp identifier did not match the proces's xcp identifier, trying to reparse the a2l file\nProcess: " + xcpIdentifier + "\nCache: " + header.value);
            shell.exec("python3 /usr/moduline/python/parse_a2l.py");
            return false
        }
        return true;
    }

    function parseA2L() {
        var parseResult = shell.exec("python3 /usr/moduline/python/parse_a2l.py")
        if (!parseResult.stdout.includes("succesfully")){
            return false;
        }
        return true;
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
