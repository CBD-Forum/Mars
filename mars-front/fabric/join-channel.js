/**
 * Copyright 2016 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

const log4js = require('koa-log4');
const logger = log4js.getLogger("join-channel");

const util = require('util');
const path = require('path');
const fs = require('fs');
const grpc = require('grpc');

const hfc = require('fabric-client');
const utils = require('fabric-client/lib/utils.js');
const Peer = require('fabric-client/lib/Peer.js');
const Orderer = require('fabric-client/lib/Orderer.js');
const EventHub = require('fabric-client/lib/EventHub.js');

const testUtil = require('./util.js');

var the_user = null;
var tx_id = null;
var nonce = null;

hfc.addConfigFile(path.join(__dirname, './config.json'));
const ORGS = hfc.getConfigSetting('test-network');

const allEventhubs = [];

const _commonProto = grpc.load(path.join(__dirname, '../node_modules/fabric-client/lib/protos/common/common.proto')).common;


function joinChannel(org) {
    logger.info(util.format('Calling peers in organization "%s" to join the channel', org));
    //
    // Create and configure the test chain
    //
    var client = new hfc();
    var chain = client.newChain(testUtil.END2END.channel);

    var orgName = ORGS[org].name;

    var targets = [],
        eventhubs = [];

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

    for (let key in ORGS[org]) {
        if (ORGS[org].hasOwnProperty(key)) {
            if (key.indexOf('peer') === 0) {
                data = fs.readFileSync(path.join(__dirname, ORGS[org][key]['tls_cacerts']));
                targets.push(
                    new Peer(
                        ORGS[org][key].requests, {
                            pem: Buffer.from(data).toString(),
                            'ssl-target-name-override': ORGS[org][key]['server-hostname']
                        }
                    )
                );

                let eh = new EventHub();
                eh.setPeerAddr(
                    ORGS[org][key].events, {
                        pem: Buffer.from(data).toString(),
                        'ssl-target-name-override': ORGS[org][key]['server-hostname']
                    }
                );
                eh.connect();
                eventhubs.push(eh);
                allEventhubs.push(eh);
            }
        }
    }

    return hfc.newDefaultKeyValueStore({
        path: testUtil.storePathForOrg(orgName)
    }).then((store) => {
        client.setStateStore(store);
        return testUtil.getSubmitter(client, org);
    })
        .then((admin) => {
            logger.info('Successfully enrolled user \'admin\'');
            the_user = admin;

            nonce = utils.getNonce();
            tx_id = chain.buildTransactionID(nonce, the_user);
            var request = {
                targets: targets,
                txId: tx_id,
                nonce: nonce
            };

            var eventPromises = [];
            eventhubs.forEach((eh) => {
                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(reject, 30000);
                    eh.registerBlockEvent((block) => {
                        clearTimeout(handle);

                        // in real-world situations, a peer may have more than one channels so
                        // we must check that this block came from the channel we asked the peer to join
                        if (block.data.data.length === 1) {
                            // Config block must only contain one transaction
                            var envelope = _commonProto.Envelope.decode(block.data.data[0]);
                            var payload = _commonProto.Payload.decode(envelope.payload);
                            var channel_header = _commonProto.ChannelHeader.decode(payload.header.channel_header);
                            if (channel_header.channel_id === testUtil.END2END.channel) {
                                logger.info('The new channel has been successfully joined on peer ' + eh.ep._endpoint.addr);
                                resolve();
                            }
                        }
                    });
                });

                eventPromises.push(txPromise);
            });

            var sendPromise = chain.joinChannel(request);
            return Promise.all([sendPromise].concat(eventPromises));
        }, (err) => {
            logger.error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to enroll user \'admin\' due to error: ' + err.stack ? err.stack : err);
        })
        .then((results) => {
            logger.info(util.format('Join Channel R E S P O N S E : %j', results));

            if (results[0] && results[0][0] && results[0][0].response && results[0][0].response.status == 200) {
                logger.info(util.format('Successfully joined peers in organization %s to join the channel', orgName));
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS"});
                });
            } else {
                logger.error(' Failed to join channel');
                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": "Failed to join channel"});
                });
                throw new Error('Failed to join channel');

            }
        }, (err) => {
            logger.error('Failed to join channel due to error: ' + err.stack ? err.stack : err);

            return new Promise(function (resolve, reject) {
                reject({"status": "FAILD", "msg": err});
            });
        });
}

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

exports = module.exports = async () => {

    // joinChannel('org1');
    // joinChannel('org2');

    return (joinChannel('org1')
            .then(() => {
                logger.info(util.format('Successfully joined peers in organization "%s" to the channel', ORGS['org1'].name));
                return joinChannel('org2');
            }, (err) => {
                logger.error(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS['org1'].name, err.stack ? err.stack : err));
                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": err});
                });
            })
            .then((response) => {
                logger.info(util.format('Successfully joined peers in organization "%s" to the channel', ORGS['org2'].name));
                disconnect();
                return new Promise(function (resolve, reject) {
                    resolve({"status": "SUCCESS"});
                });
            }, (err) => {
                logger.error(util.format('Failed to join peers in organization "%s" to the channel. %s', ORGS['org2'].name), err.stack ? err.stack : err);
                disconnect();
                return new Promise(function (resolve, reject) {
                    reject({"status": "FAILD", "msg": err});
                });
            })
        // .catch(function (err) {
        //     logger.error('Failed request. ' + err);
        //     disconnect();
        //     return new Promise(function (resolve, reject) {
        //         reject({"status": "FAILD", "msg": err});
        //     });
        // })
    );
};