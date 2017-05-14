const mongo = require('mongoskin');
const util = require('../../common/util');
const db = require('../../mongo');

const find = async function (ctx, next) {
    let banks;

    /**
     * 查询所有银行
     * @returns {Promise}
     */
    await async function () {
        let query = ctx.query.query ? JSON.parse(ctx.query.query) : {};
        return new Promise(function (resolve, reject) {
            db.bank.find(query).toArray(async function (err, result) {
                if (!err) {
                    banks = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = banks;
};

const findById = async function (ctx, next) {

    let bank_id = ctx.params.id;

    let bank;

    /**
     * 根据Id查询所有银行
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.findOne({"_id": mongo.helper.toObjectID(bank_id)}, async function (err, result) {
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

    ctx.body = bank;
};

const add = async function (ctx, next) {

    let banks = util.fillObjectID(ctx.request.body);

    /**
     * 添加银行
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.insert(banks, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = banks;
    ctx.status = 201;
};


const delAll = async function (ctx, next) {

    /**
     * 删除所有银行
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.remove({}, async function (err, result) {
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

    let bank_id = ctx.params.id;

    /**
     * 根据Id查询所有银行
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.bank.remove({"_id": mongo.helper.toObjectID(bank_id)}, async function (err, result) {
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

exports = module.exports = {
    find,
    findById,
    add,
    delAll,
    delById
};