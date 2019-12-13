YELLOW='\033[33m'
NORMAL='\033[0m'

echo -e "${YELLOW}Install libqmi tools ${NORMAL}"
apt-get -y install libqmi-utils

echo -e "${YELLOW}Install udhcpc ${NORMAL}"
apt-get -y install udhcpc

