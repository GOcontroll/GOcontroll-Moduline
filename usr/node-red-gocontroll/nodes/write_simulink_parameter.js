module.exports = function(RED) {
    "use strict"
    
    const shell = require("shelljs");
    const fs = require("fs");
    
    function GOcontrollWriteSimulink(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        import("uiojs").then(uiojs=>{

        let simulink = false;
        let res, Signal, asap_signal, ParameterFile;
        var intervalRead,intervalCheck = null;
        const sampleTime = config.sampleTime;
        const inputKey = config.KeyIn;
        const parameterName = config.parameter;
        var msgOut={};
        let pid = "";
        node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})
    
        intervalCheck = setInterval(check_model,2000);
        
        
    
        //Check if the simulink model is running and get its PID
        function check_model() {
            var pidof = shell.exec("pidof gocontroll.elf");
            pid = pidof.stdout.split("\n")[0];
            if (!pidof.code){
                try{
                    //check if the address or size of the signal has changed due to a recompilation of the model
                    ParameterFile = fs.readFileSync("/usr/simulink/parameters.json");
                } catch(err) {
                    node.warn("Error reading parameters.json, trying to parse the file...");
                    var parseResult = shell.exec("python3 /usr/moduline/python/parse_a2l.py")
                    if (!parseResult.stdout.includes("succesfully")){
                        node.status({fill:"red", shape:"dot", text:"An error occured parsing gocontroll.a2l"});
                        exit(-1);
                    }
                    check_model();
                    return;
                }
                var localSignals = JSON.parse(ParameterFile);
                //get the desired parameter from the list of parameters
                Signal = findValueByPrefix(localSignals, parameterName);
                if (Signal){
                    asap_signal = new uiojs.asap_element(Signal.address, Signal.type, Signal.size);
                } else {
                    node.status({fill:"red", shape:"dot", text:"The selected signal could not be found in parameters.json"});
                    exit(-1);
                }

                pid = parseInt(pid);
                simulink = true;
                intervalRead = setInterval(readSignal, parseInt(sampleTime));
                clearInterval(intervalCheck);
                console.log("simulink model started")
                node.status({fill:"green",shape:"dot",text:"Writing/reading " + parameterName});
            } else {
                node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
            }
        }
    
        //Read the signal from the found pid
        function readSignal() {
            if (simulink == true){
                try{
                    res = uiojs.process_read(pid, asap_signal);
                    msgOut={[parameterName]:res};
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
        });
        node.on("input", function(msg){
            if (simulink) {
                try{
                    uiojs.process_write(pid, asap_signal, msg[config.keyIn]);
                } catch(err) {
                    simulink=false;
                    node.warn("failed to write simulink parameter." + err)
                }
            }
        });
        }).catch(err=>{
            node.status({fill:"red",shape:"dot",text:"could not load uiojs, module missing"});
            return;
        });
    }
    
    RED.nodes.registerType("Write-Simulink-Parameter",GOcontrollWriteSimulink);
}
    