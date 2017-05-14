#!/usr/bin/env bash

echo "初始化安装系统环境"

# 安装docker ce
echo "安装docker ce"
sudo apt-get -y install apt-transport-https ca-certificates curl
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
# sudo apt-get -y install docker-ce
sudo curl -fsSL https://get.docker.com/ | sh
sudo usermod -aG docker ${USER}

## 配置docker加速器
echo "配置docker加速器"
echo '{
"registry-mirrors" : [
  "http://7c8b468b.m.daocloud.io",
  "https://nnbd72f0.mirror.aliyuncs.com"
  ]
}' | sudo tee /etc/docker/daemon.json

sudo service docker restart


ORIGINAL_VERSION=x86_64-1.0.0-alpha
TARGET_VERSION=latest

## 下载镜像
echo "下载镜像"
sudo docker pull hyperledger/fabric-orderer:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-peer:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-zookeeper:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-couchdb:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-kafka:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-ca:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-ccenv:${ORIGINAL_VERSION};
sudo docker pull hyperledger/fabric-javaenv:${ORIGINAL_VERSION};

## 将全部fabric镜像设置latest标签
echo "设置镜像latest标签"
sudo docker tag hyperledger/fabric-orderer:${ORIGINAL_VERSION} hyperledger/fabric-orderer:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-peer:${ORIGINAL_VERSION} hyperledger/fabric-peer:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-zookeeper:${ORIGINAL_VERSION} hyperledger/fabric-zookeeper:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-couchdb:${ORIGINAL_VERSION} hyperledger/fabric-couchdb:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-kafka:${ORIGINAL_VERSION} hyperledger/fabric-kafka:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-ca:${ORIGINAL_VERSION} hyperledger/fabric-ca:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-ccenv:${ORIGINAL_VERSION} hyperledger/fabric-ccenv:${TARGET_VERSION};
sudo docker tag hyperledger/fabric-javaenv:${ORIGINAL_VERSION} hyperledger/fabric-javaenv:${TARGET_VERSION};

## 安装docker-compose
echo "安装docker-compose"
sudo curl -L https://github.com/docker/compose/releases/download/1.11.2/run.sh > /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo docker-compose --version

## 安装git
echo "安装git & g++"
sudo apt-get install git
sudo apt-get install g++
sudo apt-get install curl
sudo apt-get install httpie

## 安装nodejs
echo "安装nodejs"
NODE_VERSION=6.10.2
sudo curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" \
  && sudo mkdir -p /opt/node \
  && sudo tar -xJf "node-v$NODE_VERSION-linux-x64.tar.xz" -C /opt/node --strip-components=1 \
  && sudo ln -s /opt/node/bin/node /usr/local/bin/node \
  && sudo ln -s /opt/node/bin/npm /usr/local/bin/npm

## 安装cnpm & gulp & nodemon & node-gyp
echo "安装cnpm & gulp & nodemon & node-gyp"
sudo npm install -g cnpm --registry=https://registry.npm.taobao.org
sudo npm install -g gulp --registry=https://registry.npm.taobao.org
sudo npm install -g nodemon --registry=https://registry.npm.taobao.org
sudo npm install -g node-gyp --registry=https://registry.npm.taobao.org
sudo npm install -g node-pre-gyp --registry=https://registry.npm.taobao.org

echo "set path"
sudo echo "export PATH=$PATH:/opt/node/bin" >> /etc/profile
sudo source /etc/profile

echo "clone code"
git clone https://sunnyshu@gitlab.chainresearch.org/mars/mars-front.git
cd mars-front/fabric/fixtures/src/
https://sunnyshu@gitlab.chainresearch.org/mars/mars-chaincode.git
cd ~/mars-front
cnpm i