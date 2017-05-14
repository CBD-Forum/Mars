var router = require('koa-router')();
const mongo = require('mongoskin');
const util = require('../common/util');
const db = require('../mongo');
const FabricApis = require('../fabric/apis');

router.get('/', async function (ctx, next) {

    ctx.state = "hello koa";

});

// 银行理财产品列表页面
router.get('/financial_products_list', async function (ctx, next) {
    // 当前登录银行信息
    var bank;

    /**
     * 查询(当前登录)银行信息
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({"Name": ctx.session.login_bank}, async function (err, result) {
                if (!err) {
                    bank = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();
    ctx.state.bank = bank;

    await ctx.render('bank_products');
});

// 我的理财产品列表页面---已经购买的理财产品
router.get('/user_financial_products_list', async function (ctx, next) {

    /**
     * 查询已经购买的理财产品
     * @returns {Promise}
     */
    let purchase_records = await async function () {
        return new Promise(function (resolve, reject) {
            db.purchase_record.find({
                "Bank": ctx.session.login_bank,
                "User": ctx.session.login_user
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
    for (var i = 0; i < purchase_records.length; i++) {
        let pid = purchase_records[i]._id.toString();
        let result = await FabricApis.queryPurchaseRecord([pid]);
        datas.push(result.data);
    }

    ctx.state.purchase_records = datas;

    await ctx.render('user_products');

});


exports = module.exports = router;
