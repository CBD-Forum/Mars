const mongo = require('mongoskin');
const util = require('../../common/util');
const db = require('../../mongo');

const find = async function (ctx, next) {
    let users;

    /**
     * 查询所有用户
     * @returns {Promise}
     */
    await async function () {
        let query = ctx.query.query ? JSON.parse(ctx.query.query) : {};
        return new Promise(function (resolve, reject) {
            db.user.find(query).toArray(async function (err, result) {
                if (!err) {
                    users = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = users;
};

const findById = async function (ctx, next) {

    let user_id = ctx.params.id;
    let user;

    /**
     * 根据Id查询用户
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.user.findOne({"_id": mongo.helper.toObjectID(user_id)}, async function (err, result) {
                if (!err) {
                    user = result;
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();


    ctx.body = user;
};

const add = async function (ctx, next) {

    let users = util.fillObjectID(ctx.request.body);

    /**
     * 添加用户
     * @returns {Promise}
     */
    await async function () {

        return new Promise(function (resolve, reject) {
            db.user.insert(users, function (err, result) {
                if (!err) {
                    resolve(result);
                } else {
                    reject(err);
                    ctx.throw(err, 500);
                }
            });
        });
    }();

    ctx.body = users;
    ctx.status = 201;
};


const delAll = async function (ctx, next) {


    /**
     * 删除所有用户
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.user.remove({}, function (err, result) {
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

    let user_id = ctx.params.id;

    /**
     * 根据Id查询所有用户
     * @returns {Promise}
     */
    await async function () {
        return new Promise(function (resolve, reject) {
            db.user.remove({"_id": mongo.helper.toObjectID(user_id)}, async function (err, result) {
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