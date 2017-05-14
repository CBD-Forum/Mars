var router = require('koa-router')();
const mongo = require('mongoskin');
const util = require('../common/util');
const db = require('../mongo');
const FabricApis = require('../fabric/apis');


// 理财单号搜索结果页面
router.get('/supervise', async function (ctx, next) {

    /**
     * 查询银行
     * @returns {Promise}
     */
    let result = await async function () {
        return new Promise(async (resolve, reject) => {
            let result = await FabricApis.querySifa();
            resolve(result.data);
        });
    }();

    ctx.state.data = result;


    await ctx.render('supervise');
});

exports = module.exports = router;