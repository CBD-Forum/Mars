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
const logger = log4js.getLogger("query");

var path = require('path');
var fs = require('fs');
var util = require('util');

var hfc = require('fabric-client');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var Orderer = require('fabric-client/lib/Orderer.js');
var EventHub = require('fabric-client/lib/EventHub.js');
var testUtil = require('./util.js');


var e2e = testUtil.END2END;
hfc.addConfigFile(path.join(__dirname, './config.json'));
var ORGS = hfc.getConfigSetting('test-network');

var tx_id = null;
var nonce = null;
var the_user = null;

module.exports = () => {

    logger.debug("query!");

    // this is a transaction, will just use org1's identity to
    // submit the request. intentionally we are using a different org
    // than the one that submitted the "move" transaction, although either org
    // should work properly
    var org = 'org1';
    var client = new hfc();
    var chain = client.newChain(e2e.channel);

    var orgName = ORGS[org].name;

    var targets = [];
    // set up the chain to use each org's 'peer1' for
    // both requests and events
    for (let key in ORGS) {
        if (ORGS.hasOwnProperty(key) && typeof ORGS[key].peer1 !== 'undefined') {
            let data = fs.readFileSync(path.join(__dirname, ORGS[key].peer1['tls_cacerts']));
            let peer = new Peer(
                ORGS[key].peer1.requests, {
                    pem: Buffer.from(data).toString(),
                    'ssl-target-name-override': ORGS[key].peer1['server-hostname']
                });
            chain.addPeer(peer);
        }
    }

    logger.debug("newDefaultKeyValueStore!");

    return hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(orgName)
    }).then((store) => {
        logger.debug("newDefaultKeyValueStore end!");
        client.setStateStore(store);
        return testUtil.getSubmitter(client, org);
    }).then((admin) => {

            logger.debug("getSubmitter end!");
            the_user = admin;

            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);

            // send query
            // var request = {
            //     chaincodeId: e2e.chaincodeId,
            //     chaincodeVersion: e2e.chaincodeVersion,
            //     chainId: e2e.channel,
            //     txId: tx_id,
            //     nonce: nonce,
            //     fcn: 'invoke',
            //     args: ['query', 'b']
            // };

            var request = {
                chaincodeId: e2e.chaincodeId,
                chaincodeVersion: e2e.chaincodeVersion,
                chainId: e2e.channel,
                txId: tx_id,
                nonce: nonce,
                fcn: 'queryPurchaseRecord',
                args: ['59113d2a2e3f2376c317f326']
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