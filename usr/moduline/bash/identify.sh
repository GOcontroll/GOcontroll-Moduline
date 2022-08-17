#!/bin/bash
node /usr/moduline/nodejs/flash-led.js 10 &
echo -e ""
cat /sys/firmware/devicetree/base/hardware
echo -e ""
lsb_release -a
echo -e "Gathering module info..."
#node /usr/moduline/nodejs/module-info-gathering > /dev/null
node /usr/moduline/nodejs/module-info-gathering

# layout=$(</usr/module-firmware/modules.txt)
# IFS=":"
# readarray -d: -t modules <<<$layout

# output=("Slot" "Type" "HW Version" "SW Version")
# n=0

# for i in "${!modules[@]}";
# do
#     case "${modules[$i]}" in

#       20-10-1*)
#         echo "slot" $(expr $i + 1)
#         echo '\t6 channel input module'
#         output+="$(expr $i + 1)"
#         output+="6 channel input module"
#         output+=
#     esac
# done

# cols=6; rows=$(expr ${#modules[@]} +1)
# echo $rows