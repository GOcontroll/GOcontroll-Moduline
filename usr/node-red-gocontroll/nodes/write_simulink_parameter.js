module.exports = function(RED) {
    "use strict"
    
    try{
        const uiojs = require("uiojs");
    } catch {
        node.status({fill:"red",shape:"dot",text:"could not load uiojs, module missing"});
        exit(-1)
    }
    const shell = require("shelljs");
    const fs = require("fs");
    
    function GOcontrollWriteSimulink(config) {
        RED.nodes.createNode(this,config);
        let simulink = false;
        let res, Signal, asap_signal, ParameterFile;
        var intervalRead,intervalCheck = null;
        var node = this;
        const sampleTime = config.sampleTime;
        const inputKey = config.KeyIn;
        const parameterName = config.parameter;
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

                pid = parseInt(pid1);
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
                    uiojs.process_write(pid, asap_signal, msg[inputKey]);
                } catch {
                    simulink=false;
                    node.warn("failed to write simulink parameter.")
                }
            }
        });
    }
    
    RED.nodes.registerType("Write-Simulink-Parameter",GOcontrollWriteSimulink);
}
    