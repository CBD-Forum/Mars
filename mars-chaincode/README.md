docker rm $(docker ps -aq)

/opt/gopath/src/github.com/hyperledger/fabric/examples/e2e_cli
./generateCfgTrx.sh mychannel
docker-compose up -d

执行./generateCfgTrx.sh mychannel，则不用执行CreateOrderBlock、CreateChannelTx
CreateOrderBlock
	./build/bin/configtxgen -profile TwoOrgs -outputBlock orderer.block
	生成 order.block
CreateChannelTx
	cd hyperledger/fabric/
	./build/bin/configtxgen -profile TwoOrgs -outputCreateChannelTx channel.tx -channelID $CHANNEL_NAME
	生成 channel.tx


docker exec -it cli bash


ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/orderer/localMspConfig/cacerts/ordererOrg0.pem
CORE_PEER_TLS_ENABLED=true
CHANNEL_NAME=mychannel

createChannel
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/orderer/localMspConfig
	CORE_PEER_LOCALMSPID=OrdererMSP

	peer channel create -o orderer0:7050 -c $CHANNEL_NAME -f crypto/orderer/channel.tx --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA >&log.txt
	生成 $CHANNEL_NAME.block

joinChannel
peer0
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer0/localMspConfig
	CORE_PEER_ADDRESS=peer0:7051
	CORE_PEER_LOCALMSPID=Org0MSP
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer0/localMspConfig/cacerts/peerOrg0.pem

	peer channel join -b $CHANNEL_NAME.block >&log.txt

peer1
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer1/localMspConfig
	CORE_PEER_ADDRESS=peer1:7051
	CORE_PEER_LOCALMSPID=Org0MSP
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer1/localMspConfig/cacerts/peerOrg0.pem

	peer channel join -b $CHANNEL_NAME.block >&log.txt

peer2
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer2/localMspConfig
	CORE_PEER_ADDRESS=peer2:7051
	CORE_PEER_LOCALMSPID=Org1MSP
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer2/localMspConfig/cacerts/peerOrg1.pem

	peer channel join -b $CHANNEL_NAME.block >&log.txt

peer3
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer3/localMspConfig
	CORE_PEER_ADDRESS=peer3:7051
	CORE_PEER_LOCALMSPID=Org1MSP
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer3/localMspConfig/cacerts/peerOrg1.pem

	peer channel join -b $CHANNEL_NAME.block >&log.txt


installChaincode
	（每个需要部署的peer节点上都要进行安装，才可以继续，后续安装，可直接获取最新数据）
	修改每个peer的环境参数
	peer chaincode install -n mars -v 1.0 -p github.com/hyperledger/fabric/examples/chaincode/go/mars >&log.txt

instantiateChaincode
	（在同一个channel中安装了此chaincode的peer之一的节点上实例化即可，实例化一次）
    peer chaincode instantiate -o orderer0:7050 --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -v 1.0 -c '{"Args":["init",""]}' -P "OR	('Org0MSP.member','Org1MSP.member')" >&log.txt

upgradeChaincode——————alpha版本测试暂未通过
	peer chaincode upgrade -o orderer0:7050 --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -v 1.0 -c '{"Args":["init",""]}' -P "OR	('Org0MSP.member','Org1MSP.member')" >&log.txt

peer3:
	chaincodeInvoke
	purchase
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["purchase","{\"PID\":\"p2017042501\",\"UserID\":\"u001\",\"FID\":\"20170401001\",\"FName\":\"mars01\",\"FBank\":\"marbank\",\"FAmount\":\"1000\"}"]}' >&log.txt
	purchaseApproval
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["purchaseApproval","p2017042501"]}' >&log.txt
	mortgage
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["mortgage","p2017042501","0a074f7267304d53501288042d2d2d2d2d424547494e202d2d2d2d2d0a4d494942597a434341516d674177494241774943412b6777436759494b6f5a497a6a304541774977457a45524d41384741315545417777496347566c636b39790a5a7a41774868634e4d5463774d6a49774d546b774e6a45785768634e4d5467774d6a49774d546b774e6a4578576a41514d5134774441594456515144444156770a5a5756794d44425a4d424d4742797147534d34394167454743437147534d34394177454841304941424546366466716a71666249675a754f522b64676f4a4d6c0a2f4661556c47493730412f69786d565559383359703459745633464442534f50694f354f2b733870486e70627742314c71687278417831506c72304d2f55576a0a5544424f4d41774741315564457745422f7751434d414177485159445652304f424259454642593262633834764c45776b58316653414552327034386a4a58770a4d42384741315564497751594d4261414646517a75515231525a502f516e2f424e4474475361386e34654e2f4d416f4743437147534d343942414d43413067410a4d45554349514465445a37314c2b4f54596362627169444e5266304c384f45784f35396d48314f33787064774d414d304d6749675879534734737639795633310a57635752466652467975376f335437326b71694c5a316e6b44754a386a57493d0a2d2d2d2d2d454e44202d2d2d2d2d0a","10","201705021732"]}' >&log.txt
	mortgageApproval
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["mortgageApproval","6cf5eabefde7006bc14dc7ae36ddec2d57a2b4346366b46f079fbc9f8f41e1d8","2"]}' >&log.txt


	chaincodeQuery
	queryPurchaseRecordsByBank
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryPurchaseRecordsByBank","marbank"]}' >&log.txt
	queryPurchaseRecord
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryPurchaseRecord","p2017042501"]}' >&log.txt
	queryMortgageByPid
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryMortgageByPid","p2017042501"]}' >&log.txt
	queryMortgageByBank
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryMortgageByBank"]}'
	querySifa
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["querySifa"]}'
	
peer0：
	CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer0/localMspConfig
	CORE_PEER_ADDRESS=peer0:7051
	CORE_PEER_LOCALMSPID=Org0MSP
	CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peer/peer0/localMspConfig/cacerts/peerOrg0.pem

	installChaincode
	（每个需要部署的peer节点上都要进行安装，才可以继续，后续安装，可直接获取最新数据）
	修改每个peer的环境参数
	peer chaincode install -n mars -v 1.0 -p github.com/hyperledger/fabric/examples/chaincode/go/mars >&log.txt

	chaincodeInvoke
	purchase
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["purchase","{\"PID\":\"p2017042501\",\"UserID\":\"u001\",\"FID\":\"20170401001\",\"FName\":\"mars01\",\"FBank\":\"marbank\"}"]}' >&log.txt
	purchaseApproval
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["purchaseApproval","p2017042501"]}' >&log.txt
	mortgage
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["mortgage","p2017042501","","10","201705021732"]}' >&log.txt
	mortgageApproval
		peer chaincode invoke -o orderer0:7050  --tls $CORE_PEER_TLS_ENABLED --cafile $ORDERER_CA -C $CHANNEL_NAME -n mars -c '{"Args":["mortgageApproval","p2017042501","2"]}' >&log.txt
	
	chaincodeQuery
	queryPurchaseRecordsByBank
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryPurchaseRecordsByBank","marbank"]}' >&log.txt
	queryPurchaseRecord
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryPurchaseRecord","p2017042501"]}' >&log.txt
	queryMortgageByPid
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryMortgageByPid","p2017042501"]}' >&log.txt
	queryMortgageByBank
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["queryMortgageByBank"]}'
	querySifa
		peer chaincode query -C $CHANNEL_NAME -n mars -c '{"Args":["querySifa"]}'
 

