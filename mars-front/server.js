#!/usr/bin/env node

/**
 * Module dependencies.
 */
const rf = require("fs");
const http = require('http');
const path = require('path');

/**
 * babel compiler
 */
const babelrc = JSON.parse(rf.readFileSync(path.resolve(__dirname, './.babelrc')).toString());
require('babel-core/register')(babelrc);
require("babel-polyfill");

const app = require('./app');
const debug = require('debug')('demo:server.js');

const log4js = require('koa-log4');
const appDir = path.resolve(__dirname, './');
const logDir = path.join(appDir, 'logs');
/**
 * make a log directory, just in case it isn't there.
 */
try {
    require('fs').mkdirSync(logDir)
} catch (e) {
    if (e.code !== 'EEXIST') {
        console.error('Could not set up log directory, error was: ', e);
        process.exit(1)
    }
}
log4js.configure(path.join(appDir, 'log4js.json'), {cwd: logDir});

/**
 * Get port from environment and store in Express.
 */

const port = normalizePort(process.env.PORT || '3000');
// app.set('port', port);

/**
 * Create HTTP server.js.
 */

const server = http.createServer(app.callback());

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server.js "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server.js "listening" event.
 */

function onListening() {
    const addr = server.address();
    // const addr = "0.0.0.0";
    const bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
