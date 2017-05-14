/**
 * 抵押记录
 * Created by sunny on 2017/4/25.
 */
const mongo = require('mongoskin');
const mongodb = require('mongodb');
const db = require('../../mongo');
const util = require('../../common/util');
const moment = require('moment');
const _ = require('lodash');

const EncrypKit = require('../../EncrypKit');
const FabricApis = require('../../fabric/apis');

//  抵押理财产品
const add = async function (ctx, next) {

    // 抵押记录
    let mortgage_record = util.fillObjectID(ctx.request.body);
    mortgage_record.Status = 1;

    let time = moment();

    mortgage_record.MortgageTime = time.toDate();

    //   查询当前银行
    let bank = await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({"Name": mortgage_record.Bank}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();


    // 调用chaincode执行抵押
    let pid = mortgage_record.Pid;
    let amount = mortgage_record.Amount + "";
    let date = time.format('L');
    // 银行证书
    let cert = bank.Cert;
    let param = [pid, cert, amount, date];
    let response = await FabricApis.mortgage(param);
    console.log(JSON.stringify(response));

    await async function () {
        return new Promise(function (resolve, reject) {
            db.mortgage_record.insert(mortgage_record, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = mortgage_record;
    ctx.status = 201;

};

//  抵押审核
const approval = async function (ctx, next) {

    let mid = ctx.request.body.mid; //抵押记录Id

    // TODO 调用chaincode执行审核
    let txid = ctx.request.body.txid;           // 交易id
    let status = ctx.request.body.status + '';  // 审批状态
    let param = [txid, status];
    let result = await FabricApis.mortgageApproval(param);

    // 执行成功后更新数据库状态
    let response = await async function () {
        return new Promise(function (resolve, reject) {
            db.mortgage_record.update({"_id": mongo.helper.toObjectID(mid)}, {$set: {"Status": Number(status)}}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();
    console.log(result);
    ctx.body = result;
};

module.exports = {
    add, approval
};
/**
 * 抵押记录
 * Created by sunny on 2017/4/25.
 */
const mongo = require('mongoskin');
const mongodb = require('mongodb');
const db = require('../../mongo');
const util = require('../../common/util');
const moment = require('moment');
const _ = require('lodash');

const EncrypKit = require('../../EncrypKit');
const FabricApis = require('../../fabric/apis');

//  抵押理财产品
const add = async function (ctx, next) {



    // 抵押记录
    let mortgage_record = util.fillObjectID(ctx.request.body);
    mortgage_record.Status = 1;

    let time = moment();

    mortgage_record.MortgageTime = time.toDate();

    //   查询当前银行
    let bank = await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({"Name": mortgage_record.Bank}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    let pid = mortgage_record.Pid;
    let amount = mortgage_record.Amount + "";
    let date = time.format('L');
    // 银行证书
    let cert = bank.Cert;

    // 查询当前资产的上链记录
    let purchase_record = await FabricApis.queryPurchaseRecord([pid]);

    // 验证签名
    let verify = await EncrypKit.verify(user.PublicKey, purchase_record, user.UserSign);

    // 如果签名验证通过 ，调用chaincode执行抵押操作
    if (verify) {
        let param = [pid, cert, amount, date];
        let response = await FabricApis.mortgage(param);
        console.log(JSON.stringify(response));

        await async function () {
            return new Promise(function (resolve, reject) {
                db.mortgage_record.insert(mortgage_record, function (err, result) {
                    if (!err) {
                        resolve(result);
                    } else {
                        reject(err);
                        ctx.throw(err, 500);
                    }
                });
            });
        }();
    }

    ctx.body = mortgage_record;
    ctx.status = 201;

};

//  抵押审核
const approval = async function (ctx, next) {

    let mid = ctx.request.body.mid; //抵押记录Id

    // 调用chaincode执行审核
    let txid = ctx.request.body.txid;           // 交易id
    let status = ctx.request.body.status + '';  // 审批状态
    let param = [txid, status];
    let result = await FabricApis.mortgageApproval(param);

    // 执行成功后更新数据库状态
    let response = await async function () {
        return new Promise(function (resolve, reject) {
            db.mortgage_record.update({"_id": mongo.helper.toObjectID(mid)}, {$set: {"Status": Number(status)}}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();
    console.log(result);
    ctx.body = result;
};

module.exports = {
    add, approval
};