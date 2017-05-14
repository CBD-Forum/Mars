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
const logger = log4js.getLogger("create-channel");

const hfc = require('fabric-client');
const util = require('util');
const fs = require('fs');
const path = require('path');

const testUtil = require('./util.js');
const utils = require('fabric-client/lib/utils.js');
const Orderer = require('fabric-client/lib/Orderer.js');

var the_user = null;

hfc.addConfigFile(path.join(__dirname, './config.json'));
const ORGS = hfc.getConfigSetting('test-network');

const sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

//
//Attempt to send a request to the orderer with the sendCreateChain method
//
module.exports = () => {
    //
    // Create and configure the test chain
    //
    const client = new hfc();
    const chain = client.newChain('mychannel');

    const caRootsPath = ORGS.orderer.tls_cacerts;
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

    // Acting as a client in org1 when creating the channel
    var org = ORGS.org1.name;

    return hfc.newDefaultKeyValueStore({
            path: testUtil.storePathForOrg(org)
        }).then((store) => {
            client.setStateStore(store);
            return testUtil.getSubmitter(client, 'org1');
        }).then((admin) => {
            logger.info('Successfully enrolled user \'admin\'');
            the_user = admin;
            // readin the envelope to send to the orderer
            data = fs.readFileSync(path.join(__dirname, './fixtures/channel/mychannel.tx'));
            logger.debug('data:' + data);
            var request = {
                envelope: data
            };
            // send to orderer
            logger.debug('send to orderer');
            return chain.createChannel(request);
        }, (err) => {
            logger.error('Failed to enroll user \'admin\'. ' + err);
        })
        .then((response) => {
            logger.debug(' response ::%j', response);
            if (response && response.status === 'SUCCESS') {
                logger.info('Successfully created the channel.');
                return sleep(5000);
            } else {
                logger.error('Failed to create the channel. ');
            }
        }, (err) => {
            logger.error('Failed to initialize the channel: ' + err.stack ? err.stack : err);
        })
        .then((nothing) => {
            logger.info('Successfully waited to make sure new channel was created.');
            return new Promise(function(resolve, reject) {
                resolve({ "status": "SUCCESS" });
            });
        }, (err) => {
            logger.error('Failed to sleep due to error: ' + err.stack ? err.stack : err);
            return new Promise(function(resolve, reject) {
                reject({ "status": "FAILD", "msg": err });
            });
        });
};