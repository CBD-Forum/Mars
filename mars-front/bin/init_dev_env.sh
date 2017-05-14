#!/usr/bin/env bash

echo '关闭服务并清空数据'
docker-compose -f ./fabric/fixtures/docker-compose.yaml down
#docker stop $(docker ps -aq) && docker rm $(docker ps -aq)
rm -rf /tmp/* && rm -rf ~/.hfc-key-store/
echo '启动服务'
docker-compose -f ./fabric/fixtures/docker-compose.yaml up -d
echo '启动MongoDB'
#docker run --name mongo -d -p 27017:27017 mongo
echo '启动 node server'
nohup nodemon ./server.js &

sleep 10

echo 'create-channel'
http POST 'http://127.0.0.1:3000/api/fabric/create-channel' \
    'Content-Type':'application/json'

echo 'join-channel'
http POST 'http://127.0.0.1:3000/api/fabric/join-channel' \
    'Content-Type':'application/json'

echo 'install-chaincode'
http POST 'http://127.0.0.1:3000/api/fabric/install-chaincode' \
    'Content-Type':'application/json'

echo 'instantiate-chaincode'
http POST 'http://127.0.0.1:3000/api/fabric/instantiate-chaincode' \
    'Content-Type':'application/json'