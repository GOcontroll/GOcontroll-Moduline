YELLOW='\033[33m'
NORMAL='\033[0m'


echo -e "${YELLOW}Update system ${NORMAL}"
apt-get update

echo -e "${YELLOW}Install hostapd ${NORMAL}"
apt-get -y install hostapd

echo -e "${YELLOW}Install dnsmasq ${NORMAL}"
echo -e "${YELLOW}delete config file if present ${NORMAL}"
rm /etc/dnsmasq.conf

apt-get -y install dnsmasq


