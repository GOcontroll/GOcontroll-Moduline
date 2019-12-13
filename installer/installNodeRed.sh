YELLOW='\033[33m'
NORMAL='\033[0m'

apt-get -y install curl

cd ~

curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh

bash nodesource_setup.sh

apt-get -y install nodejs

apt-get -y install build-essential

npm cache clean -f

npm install -g n

n stable

npm install -g --unsafe-perm node-red

echo -e "${YELLOW}Start Node RED to generate root folder ${NORMAL}"
timeout 20 node-red

npm install -g node-red-admin

wget https://raw.githubusercontent.com/node-red/raspbian-deb-package/master/resources/nodered.service -O /lib/systemd/system/nodered.service

wget https://raw.githubusercontent.com/node-red/raspbian-deb-package/master/resources/node-red-start -O /usr/bin/node-red-start

wget https://raw.githubusercontent.com/node-red/raspbian-deb-package/master/resources/node-red-stop -O /usr/bin/node-red-stop

chmod +x /usr/bin/node-red-st*

systemctl daemon-reload



