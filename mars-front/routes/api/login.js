const _ = require('lodash');
const db = require('../../mongo');
db.bind('user');

const login = async function (ctx, next) {

    // 用户名
    let user_name = ctx.request.body.UserName;
    // 证书内容
    let cert_content = ctx.request.body.CertContent;

    /**
     * 根据用户名查询用户
     * @returns {Promise}
     */
    try {
        let result = await async function () {
            return new Promise(function (resolve, reject) {
                db.user.findOne({"Name": user_name}, async function (err, result) {
                    if (!err) {
                        if (!result) {
                            reject("用户不存在!");
                        }
                        let user = result;
                        for (let i in user.Certs) {
                            let cert = user.Certs[i].CertContent;
                            if (cert === cert_content) {
                                return resolve({
                                    login_user: user,
                                    login_bank: user.Certs[i].Bank
                                });
                            }
                        }
                        reject("证书错误!");
                    } else {
                        reject(err);
                    }
                });
            });
        }();

        let login_user = result.login_user.Name;
        let login_bank = result.login_bank;

        ctx.session.login_user = login_user;
        ctx.session.login_bank = login_bank;

        ctx.body = {
            login_user: login_user,
            login_bank: login_bank
        };

    } catch (err) {
        ctx.status = 400;
        ctx.body = err;
    }
};

exports = module.exports = login;