// index
package main

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

// 将indexType和Key添加索引至value
func CreateValueIndex(stub shim.ChaincodeStubInterface, indexType, key, value string) error {
	if value == "" {
		return errors.New("索引的值value不能为空")
	}
	//索引类型+KEY重新组合成key
	key = indexType + key
	b, _ := stub.GetState(key)
	if len(b) != 0 {
		if string(b) != value {
			fmt.Errorf("类型为%s、KEY为%s的索引已存在，值为%s", indexType, key, string(b))
			return fmt.Errorf("类型为%s、KEY为%s的索引已存在，且索引值不相同", indexType, key)
		} else {
			return nil
		}
	}
	err := stub.PutState(key, []byte(value))
	if err != nil {
		return err
	}
	return nil
}

// 根据indexType和Key获取value
func GetValueByIndex(stub shim.ChaincodeStubInterface, indexType, key string) (string, error) {
	b, err := stub.GetState(indexType + key)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// 删除indexType和Key的索引
func DelValueIndex(stub shim.ChaincodeStubInterface, indexType, key string) error {
	err := stub.DelState(indexType + key)
	if err != nil {
		return err
	}
	return nil
}

// 创建字符串数组的索引
func CreateArrayIndex(stub shim.ChaincodeStubInterface, indexType, key, value string) error {
	if key == "" || value == "" {
		return errors.New("Index key or value is nil")
	}
	key = indexType + key

	var err error
	var b []byte
	var values []string

	b, _ = stub.GetState(key)
	json.Unmarshal(b, &values)

	flag := false
	for _, v := range values {
		if v == value {
			flag = true
			break
		}
	}

	if !flag {
		values = append(values, value)
		b, _ = json.Marshal(values)

		err = stub.PutState(key, b)
		if err != nil {
			return err
		}
	}

	return nil
}

// 查询字符串数组的索引
func GetArrayByIndex(stub shim.ChaincodeStubInterface, indexType, key string) ([]string, error) {
	if key == "" {
		return nil, errors.New("Index key is nil")
	}
	key = indexType + key

	var b []byte
	var values []string

	b, _ = stub.GetState(key)
	json.Unmarshal(b, &values)

	return values, nil
}

// 删除字符串数组的索引
func DelArrayIndex(stub shim.ChaincodeStubInterface, indexType, key, value string) error {
	if key == "" {
		return errors.New("Index key is nil")
	}
	key = indexType + key

	var err error
	var b []byte
	var values, res []string

	b, _ = stub.GetState(key)
	json.Unmarshal(b, &values)

	for _, v := range values {
		if v == value {
			continue
		} else {
			res = append(res, v)
		}
	}
	b, err = json.Marshal(res)
	if err != nil {
		return err
	}
	err = stub.PutState(key, b)
	if err != nil {
		return err
	}
	return nil
}
