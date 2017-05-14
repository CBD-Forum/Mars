// mars_model
package main

const (
	//状态值枚举
	CONST_STATUS_Request  string = "1" //申请
	CONST_STATUS_Approved string = "2" //审核通过
	CONST_STATUS_Deny     string = "3" //审核不通过

	//索引类型枚举
	CONST_INDEX_TYPE_PR string = "PR" //购买记录的索引类型
	CONST_INDEX_TYPE_MR string = "MR" //质押记录的索引类型
	CONST_INDEX_TYPE_ID string = "ID" //用户id的索引类型

	CONST_INDEX_KEY_SIFA = "SIFA" //司法

)

//购买记录
type PurchaseRecord struct {
	PID             string            `json:"PID"`             //购买记录ID(主键)
	UserCert        string            `json:"UserCert"`        //用户证书
	UserID          string            `json:"UserID"`          //用户身份证号
	FID             string            `json:"FID"`             //理财产品ID
	FName           string            `json:"FName"`           //理财产品名称
	FBank           string            `json:"FBank"`           //理财产品所属银行
	FAmount         string            `json:"FAmount"`         //理财产品金额
	FIncome         string            `json:"FIncome"`         //理财产品年化收益
	FStartDate      string            `json:"FStartDate"`      //理财产品开始日期
	FEndDate        string            `json:"FEndDate"`        //理财产品结束日期
	Balance         float64           `json:"Balance"`         //购买的理财产品余额
	PurchaseTime    string            `json:"PurchaseTime"`    //购买时间
	Status          string            `json:"Status"`          //状态(1:申请,2:通过,3:不通过)
	MortgageRecords []*MortgageRecord `json:"MortgageRecords"` //质押记录列表
	Dict            map[string]string `json:"Dict"`            //扩展信息Dict
}

//质押记录
type MortgageRecord struct {
	MID          string            `json:"MID"`          //购买记录ID(主键)
	UserCert     string            `json:"UserCert"`     //用户证书
	PID          string            `json:"PID"`          //购买理财记录的ID
	FID          string            `json:"FID"`          //理财产品ID
	FName        string            `json:"FName"`        //理财产品名称
	FBank        string            `json:"FBank"`        //理财产品所属银行
	FAmount      string            `json:"FAmount"`      //理财产品金额
	FIncome      string            `json:"FIncome"`      //理财产品年化收益
	FStartDate   string            `json:"FStartDate"`   //理财产品开始日期
	FEndDate     string            `json:"FEndDate"`     //理财产品结束日期
	MBank        string            `json:"MBank"`        //理财产品质押银行
	MAmount      float64           `json:"MAmount"`      //质押金额
	LoanAmount   float64           `json:"LoanAmount"`   //贷款金额
	MortgageTime string            `json:"MortgageTime"` //质押时间
	Status       string            `json:"Status"`       //状态(1:申请,2:通过,3:不通过)
	Dict         map[string]string `json:"Dict"`         //扩展信息Dict
}

type SifaUser struct {
	UserID         string            `json:"UserID"`         //UserID
	PurchaseRecord []*PurchaseRecord `json:"PurchaseRecord"` //购买记录列表
}
