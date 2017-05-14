var router = require('koa-router')();
const mongo = require('mongoskin');
const util = require('../common/util');
const db = require('../mongo');
const FabricApis = require('../fabric/apis');

// 理财单号搜索页面
router.get('/mortgage_search', async function (ctx, next) {
    await ctx.render('mortgage_search');
});


// 理财单号抵押记录
router.get('/mortgage_record', async function (ctx, next) {

    //获取理财单号
    var pid = ctx.query.id;

    /**
     * 查询
     * @returns {Promise}
     */
    let PurchaseRecord = await async function () {
        return new Promise(async (resolve, reject) => {
            let result = await FabricApis.queryPurchaseRecord([pid]);
            resolve(result.data);
        });
    }();


    /**
     * 查询抵押历史纪录
     * @returns {Promise}
     */
    let MortgageRecord = await async function () {
        return new Promise(async (resolve, reject) => {
            let result = await FabricApis.queryMortgageByPid([pid]);
            resolve(result.data);
        });
    }();

    ctx.state.pid = pid;
    ctx.state.MortgageRecord = MortgageRecord;
    ctx.state.PurchaseRecord = PurchaseRecord;

    await ctx.render('mortgage_record');
});

// 理财单号搜索结果页面
router.get('/mortgage', async function (ctx, next) {

    //获取理财单号
    var pid = ctx.query.id;

    /**
     * 查询
     * @returns {Promise}
     */
    let PurchaseRecord = await async function () {
        return new Promise(async (resolve, reject) => {
            let result = await FabricApis.queryPurchaseRecord([pid]);
            resolve(result.data);
        });
    }();


    /**
     * 查询抵押历史纪录
     * @returns {Promise}
     */
    let MortgageRecord = await async function () {
        return new Promise(async (resolve, reject) => {
            let result = await FabricApis.queryMortgageByPid([pid]);
            resolve(result.data);
        });
    }();

    ctx.state.pid = pid;
    ctx.state.MortgageRecord = MortgageRecord;
    ctx.state.PurchaseRecord = PurchaseRecord;

    await ctx.render('mortgage');
});

exports = module.exports = router;