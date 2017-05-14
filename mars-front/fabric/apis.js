/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

const log4js = require('koa-log4');
const logger = log4js.getLogger("invoke-transaction");

const path = require('path');
const fs = require('fs');
const util = require('util');

const hfc = require('fabric-client');
const fabric_utils = require('fabric-client/lib/utils.js');
const Peer = require('fabric-client/lib/Peer.js');
const Orderer = require('fabric-client/lib/Orderer.js');
const EventHub = require('fabric-client/lib/EventHub.js');
const SdkUtil = require('./util.js');
const e2e = SdkUtil.END2END;
hfc.addConfigFile(path.join(__dirname, './config.json'));
const ORGS = hfc.getConfigSetting('test-network');

var tx_id = null;
var nonce = null;
var the_user = null;
var allEventhubs = [];

// disconnect the event hub
function disconnect() {
    let ehs = allEventhubs;
    return function () {
        for (let key in ehs) {
            let eventhub = ehs[key];
            if (eventhub && eventhub.isconnected()) {
                logger.info('Disconnecting the event hub');
                eventhub.disconnect();
            }
        }
    };
}

// this is a transaction, will just use org2's identity to
// submit the request. intentionally we are using a different org
// than the one that instantiated the chaincode, although either org
// should work properly


/**
 * 用户购买理财产品
 * @param param 参数
 * @returns {Promise.<TResult>}
 */
module.exports.purchase = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke purchase!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {
        logger.info('Successfully enrolled user \'admin\'');
        the_user = admin;
        nonce = fabric_utils.getNonce();
        tx_id = chain.buildTransactionID(nonce, the_user);
        fabric_utils.setConfigSetting('E2E_TX_ID', tx_id);
        logger.info('setConfigSetting("E2E_TX_ID") = %s', tx_id);
        logger.debug(util.format('Sending transaction "%s"', tx_id));

        // send proposal to endorser
        var request = {
            chaincodeId: e2e.chaincodeId,
            chaincodeVersion: e2e.chaincodeVersion,
            fcn: 'purchase',
            args: [JSON.stringify(param)],
            chainId: e2e.channel,
            txId: tx_id,
            nonce: nonce
        };
        return chain.sendTransactionProposal(request);
    }, (err) => {
        logger.error('Failed to enroll user \'admin\'. ' + err);
        throw new Error('Failed to enroll user \'admin\'. ' + err);
    }).then((results) => {
        var proposalResponses = results[0];
        var proposal = results[1];
        var header = results[2];
        var all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                one_good = true;
                logger.info('transaction proposal was good');
            } else {
                logger.error('transaction proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            logger.info(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
            var request = {
                proposalResponses: proposalResponses,
                proposal: proposal,
                header: header
            };

            // set the transaction listener and set a timeout of 30sec
            // if the transaction did not get committed within the timeout period,
            // fail the test
            var deployId = tx_id.toString();

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(reject, 30000);

                    eh.registerTxEvent(deployId.toString(), (tx, code) => {
                        clearTimeout(handle);
                        eh.unregisterTxEvent(deployId);

                        if (code !== 'VALID') {
                            logger.error('The balance transfer transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            logger.info('The balance transfer transaction has been committed on peer ' + eh.ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);

            });

            var sendPromise = chain.sendTransaction(request);
            return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    logger.debug(' event promise all complete and testing complete');
                    return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                }).catch((err) => {

                    logger.error('Failed to send transaction and get notifications within the timeout period.');
                    throw new Error('Failed to send transaction and get notifications within the timeout period.');

                });

        } else {
            logger.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        }
    }, (err) => {
        logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);

    }).then((response) => {
        if (response.status === 'SUCCESS') {
            logger.info('Successfully sent transaction to the orderer.');
            logger.debug('******************************************************************');
            logger.debug('To manually run query.js, set the following environment variables:');
            logger.debug('E2E_TX_ID=' + '\'' + tx_id + '\'');
            logger.debug('******************************************************************');

            return new Promise(function (resolve, reject) {
                resolve(response);
            });

        } else {
            logger.error('Failed to order the transaction. Error code: ' + response.status);
            throw new Error('Failed to order the transaction. Error code: ' + response.status);
            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": response});
            });
        }
    }, (err) => {
        logger.error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 抵押申请
 * @param param 参数
 * @returns {Promise.<TResult>}
 */
module.exports.mortgage = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke mortgage!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {
        logger.info('Successfully enrolled user \'admin\'');
        the_user = admin;
        nonce = fabric_utils.getNonce();
        tx_id = chain.buildTransactionID(nonce, the_user);
        fabric_utils.setConfigSetting('E2E_TX_ID', tx_id);
        logger.info('setConfigSetting("E2E_TX_ID") = %s', tx_id);
        logger.debug(util.format('Sending transaction "%s"', tx_id));

        // send proposal to endorser
        var request = {
            chaincodeId: e2e.chaincodeId,
            chaincodeVersion: e2e.chaincodeVersion,
            fcn: 'mortgage',
            args: param,
            chainId: e2e.channel,
            txId: tx_id,
            nonce: nonce
        };
        return chain.sendTransactionProposal(request);
    }, (err) => {
        logger.error('Failed to enroll user \'admin\'. ' + err);
        throw new Error('Failed to enroll user \'admin\'. ' + err);
    }).then((results) => {
        var proposalResponses = results[0];
        var proposal = results[1];
        var header = results[2];
        var all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                one_good = true;
                logger.info('transaction proposal was good');
            } else {
                logger.error('transaction proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            logger.info(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
            var request = {
                proposalResponses: proposalResponses,
                proposal: proposal,
                header: header
            };

            // set the transaction listener and set a timeout of 30sec
            // if the transaction did not get committed within the timeout period,
            // fail the test
            var deployId = tx_id.toString();

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(reject, 30000);

                    eh.registerTxEvent(deployId.toString(), (tx, code) => {
                        clearTimeout(handle);
                        eh.unregisterTxEvent(deployId);

                        if (code !== 'VALID') {
                            logger.error('The balance transfer transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            logger.info('The balance transfer transaction has been committed on peer ' + eh.ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);

            });

            var sendPromise = chain.sendTransaction(request);
            return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    logger.debug(' event promise all complete and testing complete');
                    return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                }).catch((err) => {

                    logger.error('Failed to send transaction and get notifications within the timeout period.');
                    throw new Error('Failed to send transaction and get notifications within the timeout period.');

                });

        } else {
            logger.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        }
    }, (err) => {
        logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);

    }).then((response) => {
        if (response.status === 'SUCCESS') {
            logger.info('Successfully sent transaction to the orderer.');
            logger.debug('******************************************************************');
            logger.debug('To manually run query.js, set the following environment variables:');
            logger.debug('E2E_TX_ID=' + '\'' + tx_id + '\'');
            logger.debug('******************************************************************');

            return new Promise(function (resolve, reject) {
                resolve(response);
            });

        } else {
            logger.error('Failed to order the transaction. Error code: ' + response.status);
            throw new Error('Failed to order the transaction. Error code: ' + response.status);
            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": response});
            });
        }
    }, (err) => {
        logger.error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 抵押申请审核
 * @param param 参数
 * @returns {Promise.<TResult>}
 */
module.exports.mortgageApproval = async (param) => {


    var org = 'org2';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke mortgageApproval!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {
        logger.info('Successfully enrolled user \'admin\'');
        the_user = admin;
        nonce = fabric_utils.getNonce();
        tx_id = chain.buildTransactionID(nonce, the_user);
        fabric_utils.setConfigSetting('E2E_TX_ID', tx_id);
        logger.info('setConfigSetting("E2E_TX_ID") = %s', tx_id);
        logger.debug(util.format('Sending transaction "%s"', tx_id));

        // send proposal to endorser
        var request = {
            chaincodeId: e2e.chaincodeId,
            chaincodeVersion: e2e.chaincodeVersion,
            fcn: 'mortgageApproval',
            args: param,
            chainId: e2e.channel,
            txId: tx_id,
            nonce: nonce
        };
        return chain.sendTransactionProposal(request);
    }, (err) => {
        logger.error('Failed to enroll user \'admin\'. ' + err);
        throw new Error('Failed to enroll user \'admin\'. ' + err);
    }).then((results) => {
        var proposalResponses = results[0];
        var proposal = results[1];
        var header = results[2];
        var all_good = true;
        for (var i in proposalResponses) {
            let one_good = false;
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                one_good = true;
                logger.info('transaction proposal was good');
            } else {
                logger.error('transaction proposal was bad');
            }
            all_good = all_good & one_good;
        }
        if (all_good) {
            logger.info(util.format('Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', proposalResponses[0].response.status, proposalResponses[0].response.message, proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
            var request = {
                proposalResponses: proposalResponses,
                proposal: proposal,
                header: header
            };

            // set the transaction listener and set a timeout of 30sec
            // if the transaction did not get committed within the timeout period,
            // fail the test
            var deployId = tx_id.toString();

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(reject, 30000);

                    eh.registerTxEvent(deployId.toString(), (tx, code) => {
                        clearTimeout(handle);
                        eh.unregisterTxEvent(deployId);

                        if (code !== 'VALID') {
                            logger.error('The balance transfer transaction was invalid, code = ' + code);
                            reject();
                        } else {
                            logger.info('The balance transfer transaction has been committed on peer ' + eh.ep._endpoint.addr);
                            resolve();
                        }
                    });
                });

                eventPromises.push(txPromise);

            });

            var sendPromise = chain.sendTransaction(request);
            return Promise.all([sendPromise].concat(eventPromises))
                .then((results) => {

                    logger.debug(' event promise all complete and testing complete');
                    return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call

                }).catch((err) => {

                    logger.error('Failed to send transaction and get notifications within the timeout period.');
                    throw new Error('Failed to send transaction and get notifications within the timeout period.');

                });

        } else {
            logger.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
            throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
        }
    }, (err) => {
        logger.error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send proposal due to error: ' + err.stack ? err.stack : err);

    }).then((response) => {
        if (response.status === 'SUCCESS') {
            logger.info('Successfully sent transaction to the orderer.');
            logger.debug('******************************************************************');
            logger.debug('To manually run query.js, set the following environment variables:');
            logger.debug('E2E_TX_ID=' + '\'' + tx_id + '\'');
            logger.debug('******************************************************************');

            return new Promise(function (resolve, reject) {
                resolve(response);
            });

        } else {
            logger.error('Failed to order the transaction. Error code: ' + response.status);
            throw new Error('Failed to order the transaction. Error code: ' + response.status);
            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": response});
            });
        }
    }, (err) => {
        logger.error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        throw new Error('Failed to send transaction due to error: ' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 根据银行查询抵押列表
 * @param param
 * @returns {Promise.<TResult>}
 */
module.exports.queryMortgageByBank = async (param) => {

    var org = 'org2';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke queryMortgageByBank!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = fabric_utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'queryMortgageByBank',
                args: param ? param : []
            };

            logger.debug("Query Chaincode :" + JSON.stringify(request));

            return chain.queryByChaincode(request);
        },
        (err) => {
            logger.debug('Failed to get submitter \'admin\'');
            logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);

        }).then((response_payloads) => {

            logger.debug("response_payloads:" + JSON.stringify(response_payloads[0].toString()));

            if (response_payloads) {
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS", "data": JSON.parse(response_payloads[0].toString())});
                });

                // for (let i = 0; i < response_payloads.length; i++) {
                // }
            } else {
                logger.error('response_payloads is null');

                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "response_payloads is null"});
                });
            }
        },
        (err) => {
            logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });

        }).catch((err) => {
        logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 根据理财产品查询抵押列表
 * @param param
 * @returns {Promise.<TResult>}
 */
module.exports.queryMortgageByPid = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }


    logger.debug("begin invoke queryMortgageByBank!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = fabric_utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'queryMortgageByPid',
                args: param
            };

            logger.debug("Query Chaincode :" + JSON.stringify(request));

            return chain.queryByChaincode(request);
        },
        (err) => {
            logger.debug('Failed to get submitter \'admin\'');
            logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);

        }).then((response_payloads) => {

            logger.debug("response_payloads:" + JSON.stringify(response_payloads[0].toString()));

            if (response_payloads) {
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS", "data": JSON.parse(response_payloads[0].toString())});
                });

                // for (let i = 0; i < response_payloads.length; i++) {
                // }
            } else {
                logger.error('response_payloads is null');

                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "response_payloads is null"});
                });
            }
        },
        (err) => {
            logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });

        }).catch((err) => {
        logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 查询当前银行的已购买的理财产品记录
 * @param param
 * @returns {Promise.<TResult>}
 */
module.exports.queryPurchaseRecords = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke queryMortgageByBank!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = fabric_utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'queryPurchaseRecords',
                args: [JSON.stringify(param)]
            };

            logger.debug("Query Chaincode :" + JSON.stringify(request));

            return chain.queryByChaincode(request);
        },
        (err) => {
            logger.debug('Failed to get submitter \'admin\'');
            logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);

        }).then((response_payloads) => {

            logger.debug("response_payloads:" + JSON.stringify(response_payloads));

            if (response_payloads) {
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS", "data": JSON.parse(response_payloads[0].toString('utf8'))});
                });

                // for (let i = 0; i < response_payloads.length; i++) {
                // }
            } else {
                logger.error('response_payloads is null');

                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "response_payloads is null"});
                });
            }
        },
        (err) => {
            logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });

        }).catch((err) => {
        logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};

/**
 * 根据id查询已购买的理财产品记录
 * @param param
 * @returns {Promise.<TResult>}
 */
module.exports.queryPurchaseRecord = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke queryMortgageByBank!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = fabric_utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'queryPurchaseRecord',
                args: param
            };

            logger.debug("Query Chaincode :" + JSON.stringify(request));

            return chain.queryByChaincode(request);
        },
        (err) => {
            logger.debug('Failed to get submitter \'admin\'');
            logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);

        }).then((response_payloads) => {

            logger.debug("response_payloads:" + JSON.stringify(response_payloads));

            if (response_payloads) {
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS", "data": JSON.parse(response_payloads[0].toString('utf8'))});
                });

                // for (let i = 0; i < response_payloads.length; i++) {
                // }
            } else {
                logger.error('response_payloads is null');

                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "response_payloads is null"});
                });
            }
        },
        (err) => {
            logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });

        }).catch((err) => {
        logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};


/**
 * 司法查询
 * @param param
 * @returns {Promise.<TResult>}
 */
module.exports.querySifa = async (param) => {


    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var caRootsPath = ORGS.orderer.tls_cacerts;
    let data = fs.readFileSync(path.join(__dirname, caRootsPath));
    let caroots = Buffer.from(data).toString();

    chain.addOrderer(
        new Orderer(
            ORGS.orderer.url, {
                'pem': caroots,
                'ssl-target-name-override': ORGS.orderer['server-hostname']
            }
        )
    );

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );

            chain.addPeer(peer);

            let eh = new EventHub();
            eh.setPeerAddr(
                ORGS[key].peer1.events, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                }
            );
            eh.connect();
            eventhubs.push(eh);
            allEventhubs.push(eh);
        }
    }

    logger.debug("begin invoke queryMortgageByBank!");

    return hfc.newDefaultKeyValueStore({
        path: SdkUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return SdkUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = fabric_utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'querySifa',
                args: []
            };

            logger.debug("Query Chaincode :" + JSON.stringify(request));

            return chain.queryByChaincode(request);
        },
        (err) => {
            logger.debug('Failed to get submitter \'admin\'');
            logger.error('Failed to get submitter \'admin\'. Error: ' + err.stack ? err.stack : err);

        }).then((response_payloads) => {

            logger.debug("response_payloads:" + JSON.stringify(response_payloads));

            if (response_payloads) {
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS", "data": JSON.parse(response_payloads[0].toString('utf8'))});
                });

                // for (let i = 0; i < response_payloads.length; i++) {
                // }
            } else {
                logger.error('response_payloads is null');

                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "response_payloads is null"});
                });
            }
        },
        (err) => {
            logger.error('Failed to send query due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });

        }).catch((err) => {
        logger.error('Failed to end to end test with error:' + err.stack ? err.stack : err);
        return new Promise(function (resolve, reject) {
            reject({"status": "FAILD", "msg": err});
        });
    });
};