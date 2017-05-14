/**
 * Created by sunny on 2017/4/25.
 */
const mongodb = require('mongodb');
const ObjectID = mongodb.ObjectID;


/**
 *  填充ObjectID
 * @param obj 待填充的对象或者对象集合
 */
const fillObjectID = (obj) => {
    if (obj instanceof Array) {
        for (let i = 0; i < obj.length; i++) {
            obj[i]._id = new ObjectID();
        }
    } else if (obj instanceof Object) {
        obj._id = new ObjectID();

    } else {
        throw("参数错误!");
    }
    return obj;
};

module.exports = {
    fillObjectID
};