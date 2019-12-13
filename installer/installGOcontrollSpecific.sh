YELLOW='\033[33m'
NORMAL='\033[0m'


echo -e "${YELLOW}Copy specific files to Platform ${NORMAL}"
cp -avr /root/GOcontroll/lib /
cp -avr /root/GOcontroll/nodered.service /lib/systemd/system
cp -avr /root/GOcontroll/interfaces /etc/network
cp -avr /root/GOcontroll/hostapd.conf /etc/hostapd
cp -avr /root/GOcontroll/hostapd /etc/default
cp -avr /root/GOcontroll/dnsmasq.conf /etc
cp -avr /root/GOcontroll/settings.js /root/.node-red
cp -avr /root/GOcontroll/node-red-contrib-canbus/ /usr
cp -avr /root/GOcontroll/node-red-gocontroll/ /usr
cp -avr /root/GOcontroll/qmi-network-raw /usr/local/bin


chmod 777 /usr/local/bin/qmi-network-raw

echo -e "${YELLOW}Activate modules for wifi ${NORMAL}"
depmod

echo -e "${YELLOW}Activate Services for wifi ${NORMAL}"
service hostapd start
service dnsmasq start

echo -e "${YELLOW}Jump node Node RED folder on root ${NORMAL}"
cd ~/.node-red

echo -e "${YELLOW}Install local node packages ${NORMAL}"
npm install /usr/node-red-contrib-canbus
npm install /usr/node-red-gocontroll

echo -e "${YELLOW}Install extra webpackages ${NORMAL}"
npm install node-red-dashboard
npm install node-red-contrib-boolean-logic
npm install node-red-contrib-dsm

echo -e "${YELLOW}Start Node-RED service ${NORMAL}"
systemctl enable nodered.service 

echo -e "${YELLOW}Reboot ${NORMAL}"
reboot
