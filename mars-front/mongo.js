/**
 * Created by sunny on 2017/4/24.
 */
const mongo = require('mongoskin');
const config = require('./config');
const db = mongo.db(config.MongodbConnectString, {native_parser: true});

db.bind('bank');            // 银行
db.bind('user');            // 用户
db.bind('purchase_record'); // 理财产品购买记录
db.bind('mortgage_record'); // 抵押记录

exports = module.exports = db;