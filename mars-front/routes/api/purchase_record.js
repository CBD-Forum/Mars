/**
 * 购买记录
 * Created by sunny on 2017/4/25.
 */
const mongodb = require('mongodb');
const db = require('../../mongo');
const util = require('../../common/util');
const moment = require('moment');
const _ = require('lodash');
const EncrypKit = require('../../EncrypKit');

const FabricApis = require('../../fabric/apis');

const find = async function (ctx, next) {

    let query = ctx.query.query ? JSON.parse(ctx.query.query) : {};

    let purchase_records;

    await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.find(query).toArray(async function (err, result) {
                if (!err) {
                    purchase_records = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = purchase_records;
};

const findById = async function (ctx, next) {

    let purchase_record_id = ctx.params.id;

    let purchase_record;

    await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.findOne({"_id": mongo.helper.toObjectID(purchase_record_id)}, async function (err, result) {
                if (!err) {
                    purchase_record = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = purchase_record;
};

//  购买理财产品
const add = async function (ctx, next) {

    // 购买记录
    let purchase_record = util.fillObjectID(ctx.request.body);

    purchase_record.Status = 1;

    //   查询当前银行
    let bank = await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({"Name": purchase_record.Bank}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    // 查询当前用户
    let user = await async function () {
        return new Promise(function (resolve, reject) {
            db.user.findOne({"Name": purchase_record.User}, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    user.FinancialProducts = [];

    // 待购买的理财产品信息
    let financial_product = _.findLast(bank.FinancialProducts, function (fp) {
        return fp.Name == purchase_record.FinancialProductName;
    });

    let start_time = moment();
    let end_time = moment().add(financial_product.CycleTime, "year");

    purchase_record.PurchaseTime = start_time.toDate();

    // 调用加密服务对用户数据进行加密
    let UserInfo = await EncrypKit.encrypt(user.PrivateKey, user);

    // 调用签名服务进行签名操作
    let UserSign = await EncrypKit.sign(user.PrivateKey, user);

    let param = {
        PID: purchase_record._id.toString(),
        UserID: user._id.toString(),
        UserInfo: UserInfo,
        UserSign: UserSign,
        FBank: bank.Name,
        FID: financial_product.Code,
        FName: financial_product.Name,
        FAmount: financial_product.Price + "",
        FIncome: financial_product.IncomeRate + "",
        FStartDate: start_time.format('L'),
        FEndDate: end_time.format('L'),
        PurchaseTime: start_time.format('L')
    };
    console.log(JSON.stringify(param));

    // 调用chaincode将数据上链
    let response = await FabricApis.purchase(param);

    console.log(JSON.stringify(response));

    await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.insert(purchase_record, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = purchase_record;
    ctx.status = 201;

};

const delAll = async function (ctx, next) {
    await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.remove({}, async function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.status = 204;

};

const delById = async function (ctx, next) {

    let purchase_record_id = ctx.params.id;

    /**
     * 根据Id查询所有银行
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.remove({"_id": mongo.helper.toObjectID(purchase_record_id)}, async function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.status = 204;

};

module.exports = {
    find,
    findById,
    add,
    delAll,
    delById
};