// main
package main

import (
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type MarsChaincode struct {
}

// 智能合约初始化
func (t *MarsChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	return t.init(stub)
}

// 智能合约执行
func (t *MarsChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	if function == "purchase" { //用户购买
		return t.purchase(stub, args)
	} else if function == "mortgage" { //质押申请
		return t.mortgage(stub, args)
	} else if function == "mortgageApproval" { //银行审核质押
		return t.mortgageApproval(stub, args)
	} else if function == "queryMortgageByBank" { //根据银行查询质押列表
		return t.queryMortgageByBank(stub, args)
	} else if function == "queryMortgageByPid" { //根据理财产品查询质押列表
		return t.queryMortgageByPid(stub, args)
	} else if function == "queryPurchaseRecordsByBank" { //根据银行查询当前用户理财列表
		return t.queryPurchaseRecordsByBank(stub, args)
	} else if function == "queryPurchaseRecord" { //根据id查询已购买的理财产品记录
		return t.queryPurchaseRecord(stub, args)
	} else if function == "querySifa" { //司法查询接口
		return t.querySifa(stub, args)
	}

	return shim.Error("Invalid invoke function name. Expecting \"invoke\" \"delete\" \"query\"")
}

func main() {
	err := shim.Start(new(MarsChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
