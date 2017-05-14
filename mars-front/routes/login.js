var router = require('koa-router')();

router.get('/user/login', async function (ctx, next) {
    
    await ctx.render('user_login');

});

exports = module.exports = router;