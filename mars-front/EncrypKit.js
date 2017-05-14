/**
 * Created by sunny on 2017/5/11.
 */

const request = require('request');
const EncryptServer = require('./config').EncryptServer;

/**
 * 加密
 * @param key  私钥
 * @param source 原始数据
 * @returns {Promise.<void>}
 */
const encrypt = async(key, source) => {
    let url = EncryptServer + "/encrypt";
    let para = {
        key: key,
        source: source
    };

    return new Promise(function (resolve, reject) {
        request.post({url: url, formData: para}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                reject(err)
            }
            resolve(body);
        });
    });
};

/**
 * 解密
 * @param source 私钥
 * @param data 加密数据
 * @returns {Promise.<void>}
 */
const decrypt = async(key, source) => {
    let url = EncryptServer + "/decrypt";
    let para = {
        key: key,
        source: source
    };
    return new Promise(function (resolve, reject) {
        request.post({url: url, formData: para}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                reject(err)
            }
            resolve(body);
        });
    });
};

/**
 * 签名
 * @param key
 * @param source
 * @returns {Promise}
 */
const sign = async(key, source) => {
    let url = EncryptServer + "/sign";
    let para = {
        key: key,
        source: data
    };
    return new Promise(function (resolve, reject) {
        request.post({url: url, formData: para}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                reject(err)
            }
            resolve(body);
        });
    });
};

/**
 *
 * @param key
 * @param source
 * @param sign
 * @returns {Promise}
 */
const verify = async(key, source, sign) => {
    let url = EncryptServer + "/verify";
    let para = {
        key: key,
        source: data,
        sign: sign
    };
    return new Promise(function (resolve, reject) {
        request.post({url: url, formData: para}, function optionalCallback(err, httpResponse, body) {
            if (err) {
                reject(err)
            }
            resolve(body);
        });
    });
};

module.exports = {
    encrypt,
    decrypt,
    sign,
    verify
};