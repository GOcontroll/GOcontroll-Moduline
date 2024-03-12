export PATH=/usr/moduline/bin:$PATH

alias identify="/usr/moduline/python/identify.py"
alias go-test-leds="python3 /usr/moduline/python/testLeds.py"
alias go-test-can="node /usr/moduline/nodejs/testcan.js"
alias go-reset-ap="/usr/moduline/bash/reset-ap.sh"
alias go-update-modules="go-modules update all"
alias go-scan-modules="go-modules scan"
alias go-overwrite-module="go-modules overwrite"
alias go-manual-update="python3 /etc/controller_update/manual_update.py"
alias go-update-rollback="python3 /etc/controller_update/controller_update_rollback.py"
alias go-parse-a2l="python3 /usr/moduline/python/parse_a2l.py"