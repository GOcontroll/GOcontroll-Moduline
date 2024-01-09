const { asap_element } = require("uiojs");

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
        let res, asap_parameter;
        var header;
        var intervalRead,intervalCheck = null;
        var localParameters;
        const sampleTime = config.sampleTime;
        const inputKey = config.keyIn;
        const parameterName = config.parameter;
        const inputMode = config.inputMode;     //true == predetermined key, false == use key(s) from input
        const outputMode = config.outputMode;   //0 == never output, 1 == output once on input, 2 == output on interval
        const xcpIdCheck = config.xcpIdCheck;   //true == validate xcp station id, false == dont
        var msgOut={};
        let pid = "";
        node.status({fill:"yellow",shape:"dot",text:"Initializing node..."})

        if (!parseA2L()) {
            node.status({fill:"red", shape:"dot", text:"An error occured parsing GOcontroll_Linux.a2l"});
            return
        }

        intervalCheck = setInterval(check_model,2000);

        //Check if the simulink model is running and get its PID
        function check_model() {
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

                localParameters = getParams();
                if (!localParameters){
                    clearInterval(intervalCheck);
                    return;
                }

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
                        return;
                    }
                }
                simulink = true;
                console.log("simulink model started")
                if (outputMode == OUTPUTMODEINTERVAL) {
                    intervalRead = setInterval(readSignal, parseInt(sampleTime));
                    clearInterval(intervalCheck);
                }
                // console.log("simulink model started")
                if (inputMode == true){
                    node.status({fill:"green",shape:"dot",text:"Writing/reading " + parameterName});
                    clearInterval(intervalCheck);
                } else {
                    node.status({fill:"green",shape:"dot",text:"Active model found, node ready."});
                    clearInterval(intervalCheck);
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
            if (header) {
                if (!checkXCPidentifierMatch(pid, header)) {
                    simulink = false
                }
            }
            if (simulink) {
                //list based input
                if (inputMode == INPUTMODELIST){
                    if (msg[inputKey]===undefined) {
                        node.error("wrong key received on input, check your configurations.\nReceived: " + JSON.stringify(msg) + "\nExpected key: " + inputKey);
                        return;
                    }
                    try{
                        uiojs.process_write(pid, asap_parameter, msg[inputKey]);
                    if (outputMode == OUTPUTMODEONCE){
                            var newVal = uiojs.process_read(pid, asap_parameter);
                            payload[parameterName]=newVal;
                            msgOut["payload"] = payload;
                            node.send(msgOut);
                        }

                    } catch(err) {
                        simulink=false;
                        node.error("failed to write simulink parameter." + err)
                        return;
                    }


                //message based input
                } else {
                    // console.log("message based input on key " + inputKey);
                    //for all keys in the incoming message
                    for (const inputParameter in msg[inputKey]) {
                        try {
                            //console.log("trying to find " + inputParameter);
                            //try to read the asap_parameter linked to that key
                            uiojs.process_write(pid, localParameters[inputParameter]["asap_parameter"], msg[inputKey][inputParameter]);
                            if (outputMode == OUTPUTMODEONCE) {
                                payload[inputParameter] = uiojs.process_read(pid, localParameters[inputParameter]["asap_parameter"]);
                            }
                        } catch (err) {
                            // simulink=false;
                            node.error("failed to write simulink parameter.\nPossibly the key" + inputParameter + " is not in the list of available parameters.\n" + err)
                            return;
                        }
                    }
                }
			msgOut["payload"] = payload;
			node.send(msgOut);
            } else {
                node.error("No simulink model running right now, unable to write the parameter(s).")
                intervalCheck = setInterval(check_model,2000);
            }
        });

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

        function getParams() {
            try{
                //check if the address or size of the signal has changed due to a recompilation of the model
                var parameterFile = fs.readFileSync("/usr/simulink/parameters.json");
            } catch(err) {
                if (parseA2L()){
                    return getParams();
                } else {
                    node.status({fill:"red", shape:"dot", text:"An error occured parsing GOcontroll_Linux.a2l"});
                    return false;
                }
            }
            return JSON.parse(parameterFile);
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

        }).catch(err=>{
            node.status({fill:"red",shape:"dot",text:"could not load uiojs, module missing"});
            return;
        });
    }

    RED.nodes.registerType("Write-Simulink-Parameter",GOcontrollWriteSimulink);
}
