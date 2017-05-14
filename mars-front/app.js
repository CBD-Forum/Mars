const path = require('path');
const Koa = require('koa');
const app = new Koa();
const session = require('koa-session');
const convert = require('koa-convert');
const render = require('koa-swig');
const json = require('koa-json');
const onerror = require('koa-onerror');
const bodyparser = require('koa-bodyparser');
const compress = require('koa-compress');
const log4js = require('koa-log4');
const co = require('co');
const filters = require('./filters/swig.filters');
const logger = log4js.getLogger("app");
logger.setLevel('DEBUG');

// error handler
onerror(app);

// middlewares

app.keys = ['it is a secret'];

const CONFIG = {
    key: 'koa:session', /** (string) cookie key (default is koa:sess) */
    maxAge: 86400000, /** (number) maxAge in ms (default is 1 days) */
    overwrite: true, /** (boolean) can overwrite or not (default true) */
    httpOnly: true, /** (boolean) httpOnly or not (default true) */
    signed: true, /** (boolean) signed or not (default true) */
};

app.use(convert(session(CONFIG, app)));

// compress middleware for koa
app.use(compress({
    threshold: 2048,
    flush: require('zlib').Z_SYNC_FLUSH
}));

app.use(bodyparser({
    onerror: function (err, ctx) {
        ctx.throw('body parse error', 422);
    }
}));

// pretty-printed JSON response middleware
app.use(json());

app.use(log4js.koaLogger(log4js.getLogger("http"), {level: 'auto'}));
// app.use(logger());

app.use(require('koa-static')(__dirname + '/public'));

// use koa-swig
app.context.render = co.wrap(render({
    root: path.join(__dirname, './views'),
    autoescape: true,
    filters: filters,
    tzOffset: 8,
    cache: 'memory', // disable, set to false
    encoding: 'utf8',
    ext: 'html'
}));


app.use(async (ctx, next) => {
    ctx.state.session = ctx.session;
    await next();
});

// routes
const api = require('./routes/api/index');
const login = require('./routes/login');
const index = require('./routes/index');
const bank = require('./routes/bank');
const mortgage = require('./routes/mortgage');
const sifa = require('./routes/sifa');

app.use(login.routes(), login.allowedMethods());
app.use(index.routes(), index.allowedMethods());
app.use(bank.routes(), bank.allowedMethods());
app.use(mortgage.routes(), mortgage.allowedMethods());
app.use(sifa.routes(), sifa.allowedMethods());

// 注册API Routers
app.use(api.routes(), api.allowedMethods());
logger.info("app start complete!");

exports = module.exports = app;