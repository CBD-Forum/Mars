const log4js = require('koa-log4');
const logger = log4js.getLogger("index");

const router = require('koa-router')();

const login = require('./login');
const bank = require('./bank');
const user = require('./user');
const purchase_record = require('./purchase_record');
const mortgage_record = require('./mortgage_record');

const create_channel = require('../../fabric/create-channel');
const join_channel = require('../../fabric/join-channel');
const install_chaincode = require('../../fabric/install-chaincode');
const instantiate_chaincode = require('../../fabric/instantiate-chaincode');
const invoke_transaction = require('../../fabric/invoke-transaction');
const query = require('../../fabric/query');

const FabricApis = require('../../fabric/apis');

router.prefix('/api');


router.post('/fabric/create-channel', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let result = await create_channel();
    console.log(result);
    ctx.body = result;
});

router.post('/fabric/join-channel', async function (ctx, next) {
    let result = await join_channel();
    console.log(result);
    ctx.body = result;
});

router.post('/fabric/install-chaincode', async function (ctx, next) {
    logger.debug("Path:/fabric/install-chaincode");
    let result = await install_chaincode();
    console.log(result);
    ctx.body = result;
});

router.post('/fabric/instantiate-chaincode', async function (ctx, next) {
    logger.debug("Path:/fabric/instantiate-chaincode");
    let result = await instantiate_chaincode();
    console.log(result);
    ctx.body = result;
});

router.post('/fabric/invoke-transaction', async function (ctx, next) {
    logger.debug("Path:/fabric/invoke-transaction");
    let result = await invoke_transaction();
    console.log(result);
    ctx.body = result;
});

router.post('/fabric/query', async function (ctx, next) {
    logger.debug("Path:/fabric/query");
    let result = await query();
    console.log(result);
    ctx.body = result;
});

// 购买理财
router.post('/fabric/purchase', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let param = {
        PID: "PID",
        UserID: "UserID",
        FBank: "FBank",
        FID: "FID",
        FName: "FName",
        FAmount: "30",
        FIncome: "5.26",
        FStartDate: "201705021732",
        FEndDate: "201705021732",
        PurchaseTime: "201705021732"
    };
    let result = await FabricApis.purchase(param);
    console.log(result);
    ctx.body = result;
});

// 抵押
router.post('/fabric/mortgage', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let pid = "PID";
    let cert = "0a074f7267324d535012c5052d2d2d2d2d424547494e2043455254494649434154452d2d2d2d2d0a4d494942336a43434159536741774942416749556531524750336633756e566543594f5569796b744768316a67514d77436759494b6f5a497a6a3045417749770a5944454c4d416b474131554542684d4356564d78457a415242674e5642416754436b4e6862476c6d62334a7561574578466a415542674e564241635444564e680a62694247636d467559326c7a593238784554415042674e5642416f544348426c5a584a50636d63794d5245774477594456515144457768775a57567954334a6e0a4d6a4165467730784e7a41314d446b774d6a55324d444261467730784f4441304d4463784d4455324d4442614d424178446a414d42674e5642414d544257466b0a62576c754d466b77457759484b6f5a497a6a3043415159494b6f5a497a6a304441516344516741457662463936662b454d6d5a71624231662f746a424f586f4c0a344e6d7232496f2b71334b694b45304865534b397451684530514c4d4b2b766f73684f3236424d52484a59356a7331644967556f2b5473712b69716970714e730a4d476f7744675944565230504151482f42415144416749454d41774741315564457745422f7751434d414177485159445652304f42425945464f5670474568530a674c656f6b496f7557424b5065645639703272454d437347413155644977516b4d434b41494a61397458394f2b397a7941614a70695a36306669707a2b37636f0a72685455665131612b335864366e48654d416f4743437147534d343942414d43413067414d455543495143756a553775594d314a52473037572b6a6244776b680a456445477453314f597158642b2b6d524d7a4934714149674b4a565a523439507875744b347242336e7736495052674447346a5a594c6464777a5830706c41520a5630453d0a2d2d2d2d2d454e442043455254494649434154452d2d2d2d2d0a";
    let amount = "10";
    let date = "201705021732";
    let param = [pid, cert, amount, date];
    let result = await FabricApis.mortgage(param);
    console.log(result);
    ctx.body = result;
});

//  查询抵押记录
router.post('/fabric/queryMortgageByBank', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let param = null;
    let result = await FabricApis.queryMortgageByBank(param);
    console.log(result);
    ctx.body = result;
});


//  查询购买记录
router.post('/fabric/queryPurchaseRecord', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let pid = "PID";
    let result = await FabricApis.queryPurchaseRecord([pid]);
    console.log(result);
    ctx.body = result;
});

//  查询抵押记录By Id
router.post('/fabric/queryMortgageByPid', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let pid = "PID";
    let result = await FabricApis.queryMortgageByPid([pid]);
    // txid = result.data[0].MID;
    console.log(result);
    ctx.body = result;
});


// 抵押审核
router.post('/fabric/mortgageApproval', async function (ctx, next) {
    logger.debug("Path:/fabric/create-channel");
    let txid = "3fe1a5d6c5e8abf25fc2c1ddf6fc639af1805675c85c0e8f2f836eac8c4a22d5";
    let status = "2";
    let param = [txid, status];
    let result = await FabricApis.mortgageApproval(param);
    console.log(result);
    ctx.body = result;
});

// 司法查询
router.post('/fabric/querySifa', async function (ctx, next) {
    let result = await FabricApis.querySifa();
    console.log(result);
    ctx.body = result;
});

// 用户登录
router.post('/users/login', login);

// 用户
router.get('/users', user.find);
router.get('/users/:id', user.findById);
router.post('/users', user.add);
router.delete('/users', user.delAll);
router.delete('/users/:id', user.delById);
// 银行
router.get('/banks', bank.find);
router.get('/banks/:id', bank.findById);
router.post('/banks', bank.add);
router.delete('/banks', bank.delAll);
router.delete('/banks/:id', bank.delById);
// 购买
router.get('/purchase_records', purchase_record.find);
router.get('/purchase_records/:id', purchase_record.findById);
router.post('/purchase_records', purchase_record.add);
router.delete('/purchase_records', purchase_record.delAll);
router.delete('/purchase_records/:id', purchase_record.delById);

// 抵押
router.post('/mortgage_records', mortgage_record.add);
router.post('/mortgage_records/approval', mortgage_record.approval);


exports = module.exports = router;