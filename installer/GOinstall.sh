
YELLOW='\033[33m'
NORMAL='\033[0m'


chmod 777 installModemTools.sh
chmod 777 installHostapdDnsmasq.sh
chmod 777 installNodeRed.sh
chmod 777 installGOcontrollSpecific.sh

echo -e "${YELLOW}Install Hostapd and Dnsmasq ${NORMAL}"

./installHostapdDnsmasq.sh

echo -e "${YELLOW}Install modem tools ${NORMAL}"

./installModemTools.sh

echo -e "${YELLOW}Install Node JS and Node RED ${NORMAL}"

./installNodeRed.sh

echo -e "${YELLOW}Install GOcontroll specific setup ${NORMAL}"

./installGOcontrollSpecific.sh
