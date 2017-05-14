// mars_impl
package main

import (
	"encoding/hex"
	"encoding/json"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

//初始化
//args:[]
func (t *MarsChaincode) init(stub shim.ChaincodeStubInterface) pb.Response {
	return shim.Success(nil)
}

//购买理财产品记录
//[{PurchaseRecord}]
//--PurchaseRecord:理财产品购买记录JSON字符串
func (t *MarsChaincode) purchase(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	//获取参数，转移成map[string]string
	var m map[string]string
	err := json.Unmarshal([]byte(args[0]), &m)
	if err != nil {
		return shim.Error(err.Error())
	}
	bcreator, _ := stub.GetCreator()
	creator := hex.EncodeToString(bcreator)
	//初始化对象
	pr := new(PurchaseRecord)
	pr.Dict = make(map[string]string)
	pr.Status = CONST_STATUS_Request //初始状态为申请状态，并忽略传入参数值
	pr.UserCert = creator

	for k, v := range m {
		switch k {
		case "PID":
			pr.PID = v
		case "UserCert":
			//忽略购买人字段
			continue
		case "UserID":
			pr.UserID = v
		case "FID":
			pr.FID = v
		case "FName":
			pr.FName = v
		case "FBank":
			pr.FBank = v
		case "FAmount":
			pr.FAmount = v
		case "FIncome":
			pr.FIncome = v
		case "FStartDate":
			pr.FStartDate = v
		case "FEndDate":
			pr.FEndDate = v
		case "Balance":
			continue
		case "PurchaseTime":
			pr.PurchaseTime = v
		case "Status":
			//忽略状态字段值
			continue
		default:
			pr.Dict[k] = v
		}
	}
	pr.Balance, _ = strconv.ParseFloat(pr.FAmount, 64)
	//判断购买记录是否存在
	bdata, err := stub.GetState(CONST_INDEX_TYPE_PR + pr.PID)
	if err != nil {
		return shim.Error(err.Error())
	}
	//如果存在，返回错误
	if bdata != nil {
		return shim.Error("PurchaseRecord already exists!")
	}
	//创建购买记录索引，把当前记录Id加入到用户列表中
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_PR, creator, pr.PID)
	if err != nil {
		return shim.Error(err.Error())
	}
	//创建购买记录索引，把当前记录Id加入到银行列表中
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_PR, pr.FBank, pr.PID)
	if err != nil {
		return shim.Error(err.Error())
	}
	//把当前购买记录Id加入到（银行，用户）列表中
	err = CreateArrayIndex(stub, pr.FBank, pr.UserCert, pr.PID)
	if err != nil {
		return shim.Error(err.Error())
	}

	//将用户ID加入司法监管列表
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_ID, CONST_INDEX_KEY_SIFA, pr.UserID)
	if err != nil {
		return shim.Error(err.Error())
	}
	//将购买记录加入到用户列表
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_PR, pr.UserID, pr.PID)
	if err != nil {
		return shim.Error(err.Error())
	}

	bdata, err = json.Marshal(pr)
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(CONST_INDEX_TYPE_PR+pr.PID, bdata)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//[PID]
func (t *MarsChaincode) purchaseApproval(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	pid := args[0]

	//判断购买记录是否存在
	bdata, err := stub.GetState(CONST_INDEX_TYPE_PR + pid)
	if err != nil {
		return shim.Error(err.Error())
	}
	pr := new(PurchaseRecord)
	json.Unmarshal(bdata, pr)
	if pr == nil {
		return shim.Error("PurchaseRecord is nil.")
	}
	pr.Status = CONST_STATUS_Approved
	bdata, err = json.Marshal(pr)
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(CONST_INDEX_TYPE_PR+pr.PID, bdata)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//质押业务实现
//[PID,MBank,MAmount,MortgageTime]
//--PID:购买的理财产品编号
//--MBank:质押银行
//--MAmount:质押金额
//--MortgageTime:质押时间
func (t *MarsChaincode) mortgage(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 4 {
		return shim.Error("Incorrect number of arguments. Expecting 3")
	}

	pid := args[0]
	mbank := args[1]
	maccount, err := strconv.ParseFloat(args[2], 64)
	if err != nil {
		return shim.Error(err.Error())
	}
	mtime := args[3]

	bcreator, _ := stub.GetCreator()
	creator := hex.EncodeToString(bcreator)

	bdata, err := stub.GetState(CONST_INDEX_TYPE_PR + pid)
	if err != nil {
		return shim.Error(err.Error())
	}
	pr := new(PurchaseRecord)
	json.Unmarshal(bdata, pr)
	if pr == nil {
		return shim.Error("PurchaseRecord is nil.")
	}
	pr.Balance = pr.Balance - maccount
	if pr.Balance < 0 {
		return shim.Error("balance < 0")
	}
	bdata, err = json.Marshal(pr)
	err = stub.PutState(CONST_INDEX_TYPE_PR+pr.PID, bdata)
	if err != nil {
		return shim.Error(err.Error())
	}

	mr := new(MortgageRecord)
	mr.MID = stub.GetTxID()
	mr.UserCert = creator
	mr.PID = pid
	mr.FID = pr.FID
	mr.FName = pr.FName
	mr.FBank = pr.FBank
	mr.FAmount = pr.FAmount
	mr.FIncome = pr.FIncome
	mr.FStartDate = pr.FStartDate
	mr.FEndDate = pr.FEndDate
	mr.MBank = mbank
	mr.MAmount = maccount
	mr.LoanAmount = maccount
	mr.MortgageTime = mtime
	mr.Status = CONST_STATUS_Request

	bdata, err = json.Marshal(mr)
	err = stub.PutState(CONST_INDEX_TYPE_MR+mr.MID, bdata)
	if err != nil {
		return shim.Error(err.Error())
	}

	//创建质押记录索引，把当前记录Id加入到购买记录列表中
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_MR, mr.PID, mr.MID)
	if err != nil {
		return shim.Error(err.Error())
	}

	//创建质押记录索引，把当前记录Id加入到质押银行记录列表中
	err = CreateArrayIndex(stub, CONST_INDEX_TYPE_MR, mr.MBank, mr.MID)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//质押审批
//[MID,Status]
//--MID:质押交易单号
//--Status:审批状态（1-待审批；2-审批通过；3-审批不通过）
func (t *MarsChaincode) mortgageApproval(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	mid := args[0]
	status := args[1]

	//判断质押记录是否存在
	bdata, err := stub.GetState(CONST_INDEX_TYPE_MR + mid)
	if err != nil {
		return shim.Error(err.Error())
	}
	mr := new(MortgageRecord)
	json.Unmarshal(bdata, mr)
	if mr == nil {
		return shim.Error("MortgageRecord is nil.")
	}
	mr.Status = status
	bdata, err = json.Marshal(mr)
	if err != nil {
		return shim.Error(err.Error())
	}
	err = stub.PutState(CONST_INDEX_TYPE_MR+mr.MID, bdata)
	if err != nil {
		return shim.Error(err.Error())
	}

	return shim.Success(nil)
}

//根据理财产品查询质押情况
//[PID]
//--PID:购买理财产品记录ID
func (t *MarsChaincode) queryMortgageByPid(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	pid := args[0]
	mids, err := GetArrayByIndex(stub, CONST_INDEX_TYPE_MR, pid)
	if err != nil {
		return shim.Error(err.Error())
	}

	mrs := make([]*MortgageRecord, 0)

	var bdata []byte
	for _, v := range mids {
		mr := new(MortgageRecord)
		bdata, err = stub.GetState(CONST_INDEX_TYPE_MR + v)
		if err != nil {
			continue
		}
		json.Unmarshal(bdata, mr)
		if mr != nil {
			mrs = append(mrs, mr)
		}
	}
	bdata, err = json.Marshal(mrs)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(bdata)
}

//根据银行查询质押列表
//[]
func (t *MarsChaincode) queryMortgageByBank(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 0 {
		return shim.Error("Incorrect number of arguments. Expecting 0")
	}
	bcreator, _ := stub.GetCreator()
	creator := hex.EncodeToString(bcreator)
	mids, err := GetArrayByIndex(stub, CONST_INDEX_TYPE_MR, creator)
	if err != nil {
		return shim.Error(err.Error())
	}

	mrs := make([]*MortgageRecord, 0)

	var bdata []byte
	for _, v := range mids {
		mr := new(MortgageRecord)
		bdata, err = stub.GetState(CONST_INDEX_TYPE_MR + v)
		if err != nil {
			continue
		}
		json.Unmarshal(bdata, mr)
		if mr != nil {
			mrs = append(mrs, mr)
		}
	}
	bdata, err = json.Marshal(mrs)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(bdata)
}

//根据银行查询当前用户理财列表
//[Bank]
//--PID:要查询的银行证书
func (t *MarsChaincode) queryPurchaseRecordsByBank(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}
	bank := args[0]
	bcreator, _ := stub.GetCreator()
	creator := hex.EncodeToString(bcreator)
	pids, err := GetArrayByIndex(stub, bank, creator)
	if err != nil {
		return shim.Error(err.Error())
	}
	prs := make([]*PurchaseRecord, 0)

	var bdata []byte
	for _, v := range pids {
		pr := new(PurchaseRecord)
		bdata, err = stub.GetState(CONST_INDEX_TYPE_PR + v)
		if err != nil {
			continue
		}
		json.Unmarshal(bdata, pr)
		if pr != nil {
			prs = append(prs, pr)
		}
	}
	bdata, err = json.Marshal(prs)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(bdata)
}

//根据理财产品id查询理财产品详细
//[PID]
//--PID:购买理财产品记录ID
func (t *MarsChaincode) queryPurchaseRecord(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	bdata, err := stub.GetState(CONST_INDEX_TYPE_PR + args[0])
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(bdata)
}

//司法查询
//[]
func (t *MarsChaincode) querySifa(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	//获取用户ID列表
	ids, err := GetArrayByIndex(stub, CONST_INDEX_TYPE_ID, CONST_INDEX_KEY_SIFA)
	if err != nil {
		return shim.Error(err.Error())
	}
	sus := make([]*SifaUser, 0)
	var bdata []byte
	for _, id := range ids {
		su := new(SifaUser)
		su.UserID = id
		su.PurchaseRecord = make([]*PurchaseRecord, 0)
		//获取用户购买记录id列表
		pids, err := GetArrayByIndex(stub, CONST_INDEX_TYPE_PR, id)
		if err != nil {
			return shim.Error(err.Error())
		}
		for _, pid := range pids {
			bdata, err = stub.GetState(CONST_INDEX_TYPE_PR + pid)
			if err != nil {
				return shim.Error(err.Error())
			}
			pr := new(PurchaseRecord)
			json.Unmarshal(bdata, pr)
			if pr == nil {
				continue
			}

			pr.MortgageRecords = make([]*MortgageRecord, 0)
			//获取购买记录的质押记录id列表
			mids, err := GetArrayByIndex(stub, CONST_INDEX_TYPE_MR, pid)
			if err != nil {
				return shim.Error(err.Error())
			}

			for _, v := range mids {
				mr := new(MortgageRecord)
				bdata, err = stub.GetState(CONST_INDEX_TYPE_MR + v)
				if err != nil {
					continue
				}
				json.Unmarshal(bdata, mr)
				if mr != nil {
					pr.MortgageRecords = append(pr.MortgageRecords, mr)
				}
			}
			su.PurchaseRecord = append(su.PurchaseRecord, pr)
		}
		sus = append(sus, su)
	}
	bdata, err = json.Marshal(sus)
	if err != nil {
		return shim.Error(err.Error())
	}
	return shim.Success(bdata)
}
