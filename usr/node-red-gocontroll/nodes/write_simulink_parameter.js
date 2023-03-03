module.exports = function(RED) {
    "use strict"

    const shell = require("shelljs");
    const fs = require("fs");

    const OUTPUTMODENEVER = "0";
    const OUTPUTMODEONCE = "1";
    const OUTPUTMODEINTERVAL = "2";
    const INPUTMODELIST = true;
    const INPUTMODEMESSAGE = false;

    function GOcontrollWriteSimulink(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        //import like this to catch the error if it is not installed on the controller.
        import("uiojs").then(uiojs=>{

        let simulink = false;
        let res, parameter, ParameterFile, asap_parameter;
        var asap_parameters = {};
        var intervalRead,intervalCheck = null;
        var localParameters;
        const sampleTime = config.sampleTime;
        const inputKey = config.keyIn;
        const parameterName = config.parameter;
        const inputMode = config.inputMode;     //true == predetermined key, false == use key(s) from input
        const outputMode = config.outputMode;   //0 == never output, 1 == output once on input, 2 == output on interval
        var msgOut={};
        let pid = "";
        node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})

        var parseResult = shell.exec("python3 /usr/moduline/python/parse_a2l.py")
        if (!parseResult.stdout.includes("succesfully")){
            node.status({fill:"red", shape:"dot", text:"An error occured parsing GOcontroll_Linux.a2l"});
            exit(-1);
        }

        intervalCheck = setInterval(check_model,2000);

        //Check if the simulink model is running and get its PID
        function check_model() {
            var pidof = shell.exec("pidof -s GOcontroll_Linux.elf");
            pid = pidof.stdout.split("\n")[0];
            if (!pidof.code){
                try{
                    //check if the address or size of the signal has changed due to a recompilation of the model
                    ParameterFile = fs.readFileSync("/usr/simulink/parameters.json");
                } catch(err) {
                    node.warn("Error reading parameters.json");
                    node.status({fill:"red", shape:"dot", text:"Unable to read from parameters.json"});
                    exit(-1);
                }
                localParameters = JSON.parse(ParameterFile);

                for (const localParameter in localParameters) {
                    localParameters[localParameter]["asap_parameter"] = new uiojs.asap_element(localParameters[localParameter]["address"], localParameters[localParameter]["type"], localParameters[localParameter]["size"]);
                }
                if (inputMode == INPUTMODELIST){
                    //get the desired parameter from the list of parameters
                    // parameter = findValueByPrefix(localParameters, parameterName);
                    try{
                        asap_parameter = localParameters[parameterName].asap_parameter;
                    } catch {
                        node.status({fill:"red", shape:"dot", text:"The selected signal could not be found in parameters.json"});
                        exit(-1);
                    }
                }

                pid = parseInt(pid);
                simulink = true;
                if (outputMode == OUTPUTMODEINTERVAL) {
                    intervalRead = setInterval(readSignal, parseInt(sampleTime));
                    clearInterval(intervalCheck);
                }
                // console.log("simulink model started")
                if (inputMode == true){
                    node.status({fill:"green",shape:"dot",text:"Writing/reading " + parameterName});
                } else {
                    node.status({fill:"green",shape:"dot",text:"Active model found, node ready."});
                }
            } else {
                simulink = false;
                node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
            }
        }

        //Read the signal from the found pid
        function readSignal() {
            if (simulink == true){
                try{
                    res = uiojs.process_read(pid, asap_parameter);
                    msgOut={[parameterName]:res};
                    node.send(msgOut);
                } catch(err) {
                    simulink = false;
                }
            } else {
                intervalCheck = setInterval(check_model,2000);
                if ( outputMode == OUTPUTMODEINTERVAL) { clearInterval(intervalRead) }
                console.log("simulink model stopped")
                node.status({fill:"red",shape:"dot",text:"Simulink model stopped, looking for entry point..."})
            }
        }

        node.on('close', function(done) {
            clearInterval(intervalRead);
            clearInterval(intervalCheck);
            done();
        });

        node.on("input", function(msg){
            var payload = {};
            if (simulink) {
                //list based input
                if (inputMode == INPUTMODELIST){
                    try{
                        uiojs.process_write(pid, asap_signal, msg[config.keyIn]);
                    if (outputMode == OUTPUTMODEONCE){
                            var newVal = uiojs.process_read(pid, asap_signal);
                            payload[parameterName]=newVal;
                        }
                    } catch(err) {
                        simulink=false;
                        node.error("failed to read simulink parameter." + err)
                        return;
                    }
                    msgOut["payload"] = payload;
                    node.send(msgOut);

                //message based input
                } else {
                    console.log("message based input on key " + inputKey);
                    //for all keys in the incoming message
                    for (const inputParameter in msg[inputKey]) {
                        try {
                            console.log("trying to find " + inputParameter);
                            //try to read the asap_parameter linked to that key
                            uiojs.process_write(pid, localParameters[inputParameter]["asap_parameter"], msg[inputKey][inputParameter]);
                            if (outputMode == OUTPUTMODEONCE) {
                                payload[inputParameter] = uiojs.process_read(pid, localParameters[inputParameter]["asap_parameter"]);
                            }
                        } catch (err) {
                            simulink=false;
                            node.error("failed to write simulink parameter." + err)
                            return;
                        }
                    }
                    msgOut["payload"] = payload;
                    node.send(msgOut);
                }
            } else {
                node.error("No simulink model running right now, unable to write the parameter(s).")
            }
        });
        }).catch(err=>{
            node.status({fill:"red",shape:"dot",text:"could not load uiojs, module missing"});
            return;
        });
    }

    RED.nodes.registerType("Write-Simulink-Parameter",GOcontrollWriteSimulink);
}
