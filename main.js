const QQBot = require('./lib/QQBot.js');

const pluginManager = {
    log: (message, isError = false) => {
        let date = new Date().toISOString();
        let output = `[${date.substring(0,10)} ${date.substring(11,19)}] ${message}`;

        if (isError) {
            console.error(output);
        } else {
            console.log(output);
        }
    },
};

const config = require('./config.js');

let qqbot = new QQBot({
    host: config.host || '127.0.0.1',
    port: config.port || 11235
});
pluginManager.log('Starting QQBot...');

qqbot.on('Error', (err) => {
    pluginManager.log(`QQBot Error: ${err.error.toString()} (${err.event})`, true);
});

qqbot.start();

let penshern = [];
let penshernCopy = [];
try {
    penshern = require('./text.js');
} catch (ex) {
    pluginManager.log('Failed to load text.js', true);
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

async function daapenActive() {
    for (let i = 1; i <= (config.count || 100); i ++) {
        if (config.unique && penshernCopy.length === 0) {
            penshernCopy.push(...penshern);
        };
        let ramdomIndex = Math.floor(Math.random() * penshernCopy.length);
        let random = penshernCopy[ramdomIndex];
        await sleep((config.sleep || 100) * [...random].length);
        if (config.isGroup === undefined ? true : config.isGroup) {
            qqbot.sendGroupMessage(config.to, random);
        } else {
            qqbot.sendPrivateMessage(config.to, random);
        };
        pluginManager.log(`Output: ${random}`);
        if (config.unique) {
            penshernCopy.splice(ramdomIndex, 1);
        };
    };
};

function daapenPassive() {
    qqbot.on('GroupMessage', (rawdata) => {
        if (config.unique && penshernCopy.length === 0) {
            penshernCopy.push(...penshern);
        };
        if (rawdata.extra.ats.indexOf(config.id) > -1) {
            let ramdomIndex = Math.floor(Math.random() * penshernCopy.length);
            let random = penshernCopy[ramdomIndex];
            qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${random}`, {noEscape: true});
            pluginManager.log(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${random}`);
        };
        if (config.unique) {
            penshernCopy.splice(ramdomIndex, 1);
        };
    });
    qqbot.on('PrivateMessage', (rawdata) => {
        if (config.unique && penshernCopy.length === 0) {
            penshernCopy.push(...penshern);
        };
        let ramdomIndex = Math.floor(Math.random() * penshernCopy.length);
        let random = penshernCopy[ramdomIndex];
        qqbot.sendPrivateMessage(rawdata.from, random);
        pluginManager.log(`Output: ${random}`);
        if (config.unique) {
            penshernCopy.splice(ramdomIndex, 1);
        };
    });
};

if (config.mode === "active") {
    daapenActive();
} else if (config.mode === "passive") {
    daapenPassive();
};
