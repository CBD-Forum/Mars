var router = require('koa-router')();
const mongo = require('mongoskin');
const util = require('../common/util');
const db = require('../mongo');
const FabricApis = require('../fabric/apis');


// 银行理财产品列表页面
router.get('/bank/login', async function (ctx, next) {
    await ctx.render('bank_login');
});

// 银行理财产品列表页面
router.get('/bank/sales', async function (ctx, next) {

    // 当前登录银行信息
    var purchase_record;

    /**
     * 查询银行理财信息列表
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            console.log("bank:", ctx.session.login_bank);
            db.purchase_record.find({"Bank": ctx.session.login_bank}).toArray(async function (err, result) {

                if (!err) {
                    purchase_record = result;
                    console.log(result);
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();
    ctx.state.purchase_record = purchase_record;

    await ctx.render('bank_sales');
});

// 银行抵押审批页面
router.get('/bank/approval', async function (ctx, next) {

    let curr_bank = ctx.session.login_bank;


    let bank = await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({
                "Name": curr_bank
            }, async function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    /**
     * 查询待审核的抵押产品
     * @returns {Promise}
     */
    let mortgage_records = await async function () {
        return new Promise(function (resolve, reject) {
            db.mortgage_record.find({
                "Bank": curr_bank
            }).toArray(async function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    let datas = [];
    for (var i = 0; i < mortgage_records.length; i++) {
        let pid = mortgage_records[i].Pid;
        let result = await FabricApis.queryMortgageByPid([pid]);
        for (let j = 0; j < result.data.length; j++) {
            let record = result.data[j];
            if (bank.Cert == record.MBank) {
                record.User = mortgage_records[i].User;
                record._id = mortgage_records[i]._id.toString();    // 数据库记录id
                datas.push(record);
            }
        }
    }

    ctx.state.mortgage_records = datas;

    await ctx.render('bank_approval');
});

exports = module.exports = router;
