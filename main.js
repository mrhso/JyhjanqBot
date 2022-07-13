'use strict';

const QQBot = require('./lib/QQBot.js');
const { toLF, toCRLF, TextEncoder } = require('ishisashiencoding');
const path = require('path');
const fs = require('fs');
const OpenCC = require('opencc');
const { v4: uuidv4 } = require('uuid');
const jieba = require('@node-rs/jieba');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const initRDKitModule = require('@rdkit/rdkit');
const sharp = require('sharp');
const java = require('java');

const conLog = (message, isError = false) => {
    let date = new Date();
    let zone = -date.getTimezoneOffset();
    let dateStr = new Date(date.getTime() + 60000 * zone).toISOString();
    let zoneStr;
    if (zone > 0) {
        zoneStr = `UTC+${zone / 60}`;
    } else if (zone === 0) {
        zoneStr = `UTC`;
    } else {
        zoneStr = `UTC${zone / 60}`;
    };
    let output = `[${dateStr.substring(0, 10)} ${dateStr.substring(11, 19)} (${zoneStr})] ${message}`;

    if (isError) {
        console.error(output);
    } else {
        console.log(output);
    };
};

let config = {};
let pMode = {};
let gMode = {};
try {
    config = require('./config.js');
} catch (ex) {
    conLog('Failed to load config.js', true);
};
try {
    pMode = require('./data/mode.private.js');
} catch (ex) {
    conLog('Failed to load mode.private.js', true);
};
try {
    gMode = require('./data/mode.group.js');
} catch (ex) {
    conLog('Failed to load mode.group.js', true);
};

let RDKitModule;
(async () => { RDKitModule = await initRDKitModule(); })();
java.classpath.push('./lib/cdk.jar');
const InChIGeneratorFactory = java.import('org.openscience.cdk.inchi.InChIGeneratorFactory');
const SilentChemObjectBuilder = java.import('org.openscience.cdk.silent.SilentChemObjectBuilder');
const DepictionGenerator = java.import('org.openscience.cdk.depict.DepictionGenerator');
const AtomContainerManipulator = java.import('org.openscience.cdk.tools.manipulator.AtomContainerManipulator');
const SmartsPattern = java.import('org.openscience.cdk.smarts.SmartsPattern');
const Cycles = java.import('org.openscience.cdk.graph.Cycles');
const InChITautomerGenerator = java.import('org.openscience.cdk.tautomers.InChITautomerGenerator');
const SmilesGenerator = java.import('org.openscience.cdk.smiles.SmilesGenerator');
const Aromaticity = java.import('org.openscience.cdk.aromaticity.Aromaticity');
const ElectronDonation = java.import('org.openscience.cdk.aromaticity.ElectronDonation');
const SmiFlavor = java.import('org.openscience.cdk.smiles.SmiFlavor');

let qqbot = new QQBot({
    CoolQAirA: config.CoolQAirA,
    host: config.host || '127.0.0.1',
    port: config.port || 11235,
});
conLog('Starting QQBot...');

qqbot.on('Error', (err) => {
    conLog(`QQBot Error: ${err.error.toString()} (${err.event})`, true);
});

qqbot.start();

// 将 Bot 所用到的稳定资讯缓存起来，随 ServerHello 更新
let botQQ;
let cacheDir;
qqbot.on('ServerHello', (rawdata) => {
    qqbot.loginQQ();
    qqbot.appDirectory();
});
qqbot.on('LoginQQ', (rawdata) => {
    botQQ = rawdata;
});
qqbot.on('AppDirectory', (rawdata) => {
    cacheDir = path.join(rawdata, 'cache');
});

let petText = {};
let petList = {};
try {
    petText = require('./text/pet.text.js');
} catch (ex) {
    conLog('Failed to load pet.text.js', true);
};
try {
    petList = require('./data/pet.list.js');
} catch (ex) {
    conLog('Failed to load pet.list.js', true);
};

let gongText = {};
let gongFormat = [];
try {
    gongText = require('./text/gong.text.js');
} catch (ex) {
    conLog('Failed to load gong.text.js', true);
};
try {
    gongFormat = require('./text/gong.format.js');
} catch (ex) {
    conLog('Failed to load gong.format.js', true);
};

let kufonText = {};
let kufonFormat = [];
try {
    kufonText = require('./text/kufon.text.js');
} catch (ex) {
    conLog('Failed to load kufon.text.js', true);
};
try {
    kufonFormat = require('./text/kufon.format.js');
} catch (ex) {
    conLog('Failed to load kufon.format.js', true);
};

let pGt = {};
let gGt = {};
try {
    pGt = require('./data/gt.private.js');
} catch (ex) {
    conLog('Failed to load gt.private.js', true);
};
try {
    gGt = require('./data/gt.group.js');
} catch (ex) {
    conLog('Failed to load gt.group.js', true);
};

let pAIxxz = {};
let gAIxxz = {};
let AIxxzUUID = {};
try {
    pAIxxz = require('./data/AIxxz.private.js');
} catch (ex) {
    conLog('Failed to load AIxxz.private.js', true);
};
try {
    gAIxxz = require('./data/AIxxz.group.js');
} catch (ex) {
    conLog('Failed to load AIxxz.group.js', true);
};
try {
    AIxxzUUID = require('./data/AIxxz.uuid.js');
} catch (ex) {
    conLog('Failed to load AIxxz.uuid.js', true);
};
let AIxxzUK = new Map();

let wtfurryDic = {};
let wtfurryIndy_s = {};
try {
    wtfurryDic = require('./text/wtfurry.index.js');
} catch (ex) {
    conLog('Failed to load wtfurry.index.js', true);
};
try {
    wtfurryIndy_s = require('./text/wtfurry.indy_s.js');
} catch (ex) {
    conLog('Failed to load wtfurry.indy_s.js', true);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const arrayRandom = (arr, unique) => {
    let index = Math.floor(Math.random() * arr.length);
    let random = arr[index];
    if (unique) {
        arr.splice(index, 1);
    };
    return random;
};

// 覆写设定，不保留注释
const writeConfig = (config, file) => {
    let str = `module.exports = ${toCRLF(JSON.stringify(config, null, 4))}\r\n`;
    let buf = Buffer.from(str);
    fs.writeFile(file, buf, (err) => {
        if (err) {
            conLog(`Failed to write ${path.basename(file)}`, true);
        };
    });
};

const reply = (rawdata, message, options) => {
    if (Object.prototype.toString.call(message) === '[object String]') {
        let length;
        let id;

        if (options && options.noEscape) {
            length = [...message.replace(/\[CQ:(.*?),(.*?)\]/gu, ' ').replace(/&#91;/gu, '[').replace(/&#93;/gu, ']').replace(/&amp;/gu, '&')].length;
        } else {
            length = [...message].length;
            message = qqbot.escape(message);
        };

        if (rawdata.group) {
            if (rawdata.from === 80000000) {
                id = qqbot.sendGroupMessage(rawdata.group, message, { noEscape: true });
            } else {
                id = qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${message}`, { noEscape: true });
            };
            // 这里要注意，数组即使为空也为真值，这与空字符串不同
            if (qqbot.parseMessage(message).extra.ats.length > 0) {
                let conout = message;
                let promises = [];
                for (let at of qqbot.parseMessage(message).extra.ats) {
                    if (at === rawdata.from) {
                        promises.push(Promise.resolve(rawdata.user));
                    } else {
                        promises.push(qqbot.groupMemberInfo(rawdata.group, at).catch(_ => {}));
                    };
                };
                Promise.all(promises).then((infos) => {
                    for (let info of infos) {
                        conout = conout.replace(new RegExp(`\\[CQ:at,qq=${info.qq}\\]`, 'gu'), `@${qqbot.escape(info.groupCard || info.name || info.qq.toString())}`);
                    };
                    conout = qqbot.parseMessage(conout).text;
                    if (rawdata.from === 80000000) {
                        conLog(`Output: ${qqbot.parseMessage(conout).text}`);
                    } else {
                        conLog(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(conout).text}`);
                    };
                }).catch(_ => {});
            } else if (rawdata.from === 80000000) {
                conLog(`Output: ${qqbot.parseMessage(message).text}`);
            } else {
                conLog(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(message).text}`);
            };
        } else {
            id = qqbot.sendPrivateMessage(rawdata.from, message, { noEscape: true });
            conLog(`Output: ${qqbot.parseMessage(message).text}`);
        };

        return id;
    };
};

const jinkohChishoh = (question) => {
    return question.replace(/([^？。！])$/gu, '$1？')
    .replace(/^/gu, '\uD800').replace(/([^\uD800？。！])[啊吗嗎吧呢的]?？/gu, '$1！').replace(/\uD800/gu, '')
    .replace(/我/gu, '\uD800').replace(/[你您]/gu, '我').replace(/\uD800/gu, '你')
    .replace(/(.)[不没沒]\1/gu, '$1')
    .replace(/难道/gu, '当然').replace(/難道/gu, '當然')
    .replace(/哪里/gu, '台湾').replace(/哪[裏裡]/gu, '台灣')
    .replace(/[谁誰]/gu, '蔡英文')
    .replace(/竟然/gu, '\uD800').replace(/究竟|到底/gu, '就').replace(/\uD800/gu, '竟然')
    .replace(/为什么/gu, '因为非常大颗').replace(/為什麼/gu, '因為非常大顆')
    .replace(/什么/gu, '竞选').replace(/什麼/gu, '競選');
};

const AIxxz = async (rawdata, question, lang = 'zh-CN', city = '', callback) => {
    let uuid = AIxxzUUID[rawdata.from];
    if (!uuid) {
        uuid = uuidv4();
        AIxxzUUID[rawdata.from] = uuid;
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
    };

    if (rawdata.extra.images.length > 0) {
        let answer = '收到图片';
        callback(answer);
        return;
    };

    let uk = AIxxzUK.get(uuid);
    if (!uk) {
        let getUKPostData = `secret=${encodeURIComponent(config.appid || 'dcXbXX0X')}|${encodeURIComponent(config.ak || '5c011b2726e0adb52f98d6a57672774314c540a0')}|${encodeURIComponent(config.token || 'f9e79b0d9144b9b47f3072359c0dfa75926a5013')}&event=GetUk&data=["${encodeURIComponent(uuid)}"]`;
        let getUK = await fetch(new URL('http://xxz_ai.aiibt.cn/app_event.php'), { method: 'POST', body: getUKPostData, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(getUKPostData) } });
        let getUKBuf = await getUK.arrayBuffer();
        let getUKChunk = JSON.parse(Buffer.from(getUKBuf).toString());
        uk = getUKChunk.data[uuid].uk;
        AIxxzUK.set(uuid, uk);
    };
    // 请求回答
    let getAnswerPostData = `app=${encodeURIComponent(config.appid || 'dcXbXX0X')}&dev=${encodeURIComponent(uuid)}&uk=${encodeURIComponent(uk)}&text=${encodeURIComponent(question)}&lang=${encodeURIComponent(lang)}&nickname=${encodeURIComponent(rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString())}&city=${encodeURIComponent(city)}`;
    let getAnswer = await fetch(new URL('http://xxz_ai.aiibt.cn/api3.php'), { method: 'POST', body: getAnswerPostData, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(getAnswerPostData) } });
    let getAnswerBuf = await getAnswer.arrayBuffer();
    let chunk = Buffer.from(getAnswerBuf).toString();
    // 特别注意，请求回答的时候 JSON 前面就可能有各种奇妙的报错了，所以要先滤掉
    chunk = chunk.substring(chunk.search(/\{/u));
    try {
        chunk = JSON.parse(chunk);
    } catch (ex) {
        conLog(ex, true);
    };
    // 先用数组存储回答，因为小信子的返回格式比较复杂
    let answer = [];
    // 排序优先度
    let order = ['title', 'description', 'picurl', 'link'];
    const sort = (a, b) => {
        let ia = order.indexOf(a);
        let ib = order.indexOf(b);
        if (ia === ib) {
            return 0;
        };
        if (ia === -1) {
            return 1;
        };
        if (ib === -1) {
            return -1;
        };
        if (ia < ib) {
            return -1;
        };
        if (ia > ib) {
            return 1;
        };
    };
    // 音乐连链接都没返回，所以没有处理的必要
    if (chunk.xxztype === 'music') {
        return;
    } else if (chunk.xxztype === 'weather' && chunk.datatype === 'weather'){
        if (chunk.city) {
            answer.push(chunk.city);
        };
        for (let data of chunk.data) {
            let line1 = [data.date, data.temperature].filter((value) => value).join('　');
            let line2 = [data.weather, data.wind].filter((value) => value).join('　');
            if (line1) {
                answer.push(line1);
            };
            if (line2) {
                answer.push(line2);
            };
            if (data.dayPictureUrl) {
                answer.push(`\u{D800}${data.dayPictureUrl}`);
            };
        };
    } else if (chunk.data && chunk.data.text1) {
        answer.push(chunk.data.text1);
    } else if (Array.isArray(chunk.data)) {
        for (let data of chunk.data) {
            // 有时数组里面还包着对象
            let list = [];
            for (let data2 in data) {
                // 如果链接与图片重复，筛掉
                if (!data2.match(/BBSCOLN/u) && !(data.link === data.picurl && data2 === 'link')) {
                    list.push(data2);
                };
            };
            list.sort(sort);
            for (let data2 of list) {
                if (data2 === 'picurl') {
                    if (data.picurl) {
                        answer.push(`\u{D800}${data.picurl}`);
                    };
                } else {
                    answer.push(data[data2]);
                };
            };
        };
    } else if (Object.prototype.toString.call(chunk.data) === '[object Object]') {
        let list = [];
        for (let data in chunk.data) {
            if (!data.match(/BBSCOLN/u) && !(chunk.data.link === chunk.data.picurl && data === 'link')) {
                list.push(data);
            };
        };
        list.sort(sort);
        for (let data of list) {
            if (data === 'picurl') {
                if (chunk.data.picurl) {
                    answer.push(`\u{D800}${chunk.data.picurl}`);
                };
            } else {
                answer.push(chunk.data[data]);
            };
        };
    } else if (!chunk.data) {
        if (chunk.note) {
            answer.push(chunk.note);
        } else {
            return;
        };
    } else {
        answer.push(chunk.data);
    };
    // 处理 URI……以及图片？
    let answerURI = [];
    for (let data of answer) {
        if (data.match(/https?:\/\//u)) {
            // 百分号编码
            // 小信子所给的 URI 格式暂时不明
            // 考虑到这样的例子
            // "link":"http:\/\/ai.xiaoxinzi.com\/tools\/gotonews.php?url=http:\/\/www.ineng.org\/jinrong\/202008\/36295.html&did=27616&title=谷歌股票價格卡比較37％的功能差異是一種過時的指控"
            // 请看这里，插进去的那里不是 U+0025，而是 U+FF05
            // 这意味着小信子是不会乱插 % 的，因此，编码后可以将 %25 替换回 %……？
            // 这是比较保守的做法
            // 但既然是你们（指文化传信）的锅，我是没甚么办法
            if (data.match(/\u{D800}/u)) {
                data = encodeURI(data.replace(/\u{D800}/gu, '')).replace(/%25/gu, '%');
                let filepath = path.join(cacheDir, Date.now().toString());
                let get = await fetch(new URL(data));
                let getBuf = await get.arrayBuffer();
                fs.writeFileSync(filepath, Buffer.from(getBuf));
                answerURI.push(`[CQ:image,file=${qqbot.escape(filepath, true)}]`);
            } else {
                data = encodeURI(data).replace(/%25/gu, '%');
                answerURI.push(qqbot.escape(data));
            };
        } else {
            answerURI.push(qqbot.escape(data));
        };
    };
    // 将数组转为换行字符串
    // 注意小信子本身返回的数据就掺杂着 CR LF
    answer = toLF(answerURI.join('\n'));
    callback(answer);
    // 如果是提醒的话，处理提醒时间
    if (chunk.xxztype === 'remind') {
        // 处理小信子返回的时间，注意时区为 UTC+8
        let remindTime = new Date(`${chunk.semantic.start_date} ${chunk.semantic.start_time || '08:00:00'} UTC+0800`);
        let remindMessage = qqbot.escape(chunk.semantic.message) || '';
        if (lang === 'zh_TW' || lang === 'zh_HK') {
            remindMessage = `提醒時間到了！${remindMessage}`;
        } else {
            remindMessage = `提醒时间到了！${remindMessage}`;
        };
        if (!(chunk.data === '提醒時間最短為1分鐘！' || chunk.data === '提醒时间最短为1分钟！')) {
            // 获取当前时间，并与小信子返回的时间相减，然后延时
            let delay = remindTime - new Date();
            await sleep(delay);
            callback(remindMessage);
        };
    };
};

const pet = (user, input, randomDie = undefined) => {
    let pet = petList[user] || {};
    let output;

    if (input.match(/^[领領][养養]/u) && input.replace(/^[领領][养養] ?/gu, '').length > 0) {
        if (pet.dead) {
            output = eval(`\`${arrayRandom(petText.readoptDead)}\``);
        } else if (pet.name) {
            output = eval(`\`${arrayRandom(petText.readopt)}\``);
        } else {
            pet.name = input.replace(/^[领領][养養] ?/gu, '');
            pet.dead = false;
            output = eval(`\`${arrayRandom(petText.adopt)}\``);
        };
    } else if (input.match(/^[喂餵投]食/u)) {
        if (pet.dead) {
            output = eval(`\`${arrayRandom(petText.dead)}\``);
        } else if (pet.name) {
            let random = Math.random();
            // 随机三位数
            let randomNumber = Math.floor(Math.random() * 900) + 100;
            // 1% 概率触发迫真 GE
            if (random < 0.01) {
                output = eval(`\`${arrayRandom(petText.goodEnding)}\``);
                pet.name = undefined;
                pet.dead = undefined;
            } else {
                output = eval(`\`${arrayRandom(petText.badEnding)}\``);
                pet.dead = true;
            };
        } else {
            output = eval(`\`${arrayRandom(petText.adoptRemind)}\``);
        };
    } else if (input.match(/^([宠寵]物|[状狀][态態])/u)) {
        if (pet.dead) {
            output = eval(`\`${arrayRandom(petText.dead)}\``);
        } else if (pet.name) {
            output = eval(`\`${arrayRandom(petText.feed)}\``);
        } else {
            output = eval(`\`${arrayRandom(petText.adoptRemind)}\``);
        };
    // 如果发红包且宠物死了，复活宠物
    } else if (input.match(/\[CQ:hb,.*?\]/u) && pet.dead) {
        output = eval(`\`${arrayRandom(petText.revive)}\``);
        pet.dead = false;
    // 0.5% 概率随机死亡
    } else if (randomDie === undefined ? pet.dead === false && Math.random() < 0.005 : pet.dead === false && randomDie) {
        output = eval(`\`${arrayRandom(petText.randomDie)}\``);
        pet.dead = true;
    };
    // 处理完毕后更改设定
    petList[user] = pet;
    writeConfig(petList, './data/pet.list.js');
    // 返回答语
    return output;
};

const alphaGong = () => {
    let output = eval(`\`${arrayRandom(gongFormat)}\``);
    if (config.simply) {
        output = new OpenCC('t2s.json').convertSync(output);
    };
    return output;
};

const alphaKufonZero = () => eval(`\`${arrayRandom(kufonFormat)}\``);

const googleTranslate = async (text, src = 'auto', tgt = 'en') => {
    // 开始请求
    let partA = `/_/TranslateWebserverUi/data/batchexecute`;
    let partB = `f.req=${encodeURIComponent(JSON.stringify([[['MkEWBc', `${JSON.stringify([[text, src, tgt, true], [null]])}`, null, 'generic']]]))}`;
    let get = await fetch(new URL(`https://translate.google.cn${partA}`), { method: 'POST', body: partB, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(partB) } });
    let getBuf = await get.arrayBuffer();
    let chunk = Buffer.from(getBuf).toString();
    chunk = chunk.substring(chunk.search(/\[/u));
    // 读入 JSON
    try {
        chunk = JSON.parse(JSON.parse(chunk)[0][2]);
    } catch (ex) {
        conLog(ex, true);
    };
    let output = '';
    for (let result of chunk[1][0][0][5]) {
        if (result[0] !== null) {
            output += result[0];
        };
    };
    return output;
};

const baiduFanyi = async (text, src = 'auto', tgt = 'en') => {
    // 百度翻译的 sign 算法源于 Google 翻译，但更为キチガイ
    // 从前 Google 翻译使用的算法请参考 https://github.com/mrhso/JyhjanqBot/blob/a2490470c08d24dcc04d10a56e0461a6bfd295b3/main.js#L495
    const getSign = (text, gtk) => {
        const nazo = (a, b) => {
            for (let c = 0; c < b.length - 2; c += 3) {
                let d = b[c + 2];
                d = d >= 'a' ? d.charCodeAt(0) - 87 : parseInt(d);
                d = b[c + 1] === '+' ? a >>> d : a << d;
                a = b[c] === '+' ? a + d & 4294967295 : a ^ d;
            };
            return a;
        };
        let gtkInt = parseInt(gtk.split('.')[0]);
        let gtkDec = parseInt(gtk.split('.')[1]);
        let a = text.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
        if (a === null) {
            let b = text.length;
            if (b > 30) {
                text = text.substr(0, 10) + text.substr(Math.floor(b / 2) - 5, 10) + text.substr(-10, 10);
            };
        } else {
            let c = [];
            for (let d = text.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), e = 0, f = d.length; f > e; e++) {
                if (d[e] !== '') {
                    // 此处 split 也不好用 [...] 代替，因为 non-BMP 两者存在差异
                    c.push.apply(c, [...d[e].split('')]);
                };
                if (e !== f - 1) {
                    c.push(a[e]);
                };
            };
            let g = c.length;
            if (g > 30) {
                text = c.slice(0, 10).join('') + c.slice(Math.floor(g / 2) - 5, Math.floor(g / 2) + 5).join('') + c.slice(-10).join('');
            };
        };
        let h = [];
        for (let i = 0, j = 0; j < text.length; j++) {
            let k = text.charCodeAt(j);
            if (k < 128) {
                h[i++] = k;
            } else {
                if (k < 2048) {
                    h[i++] = k >> 6 | 192;
                } else {
                    if ((k & 64512) === 55296 && j + 1 < text.length && (text.charCodeAt(j + 1) & 64512) === 56320) {
                        k = 65536 + ((k & 1023) << 10) + (text.charCodeAt(++j) & 1023);
                        h[i++] = k >> 18 | 240;
                        h[i++] = k >> 12 & 63 | 128;
                    } else {
                        h[i++] = k >> 12 | 224;
                    };
                    h[i++] = k >> 6 & 63 | 128;
                };
                h[i++] = 63 & k | 128;
            };
        };
        let l = gtkInt;
        let m;
        for (m = 0; m < h.length; m++) {
            l += h[m];
            l = nazo(l, '+-a^+6');
        };
        l = nazo(l, '+-3^+b+-f');
        l ^= gtkDec;
        if (l < 0) {
            l = (2147483647 & l) + 2147483648;
        };
        l %= 1e6;
        return `${l}.${l ^ gtkInt}`;
    };
    // 开始请求
    let getCookie = await fetch(new URL('https://fanyi.baidu.com/'));
    // 百度翻译最坑的一点在于要带 Cookie 请求，得到的 Token 才有效，所以要先拿到 Cookie 再重新请求
    let cookie = getCookie.headers.raw()['set-cookie'];
    let getToken = await fetch(new URL('https://fanyi.baidu.com/'), { headers: { 'Cookie': cookie } });
    let getTokenBuf = await getToken.arrayBuffer();
    let getTokenChunk = Buffer.from(getTokenBuf).toString();
    let token = getTokenChunk.match(/token: '(.*?)'/u)[1];
    // gtk 类似于 Google 翻译的 tkk
    let gtk = getTokenChunk.match(/gtk = "(.*?)"/u)[1];
    // sign 类似于 Google 翻译的 tk
    let sign = getSign(text, gtk);
    let postData = `from=${encodeURIComponent(src)}&to=${encodeURIComponent(tgt)}&query=${encodeURIComponent(text)}&transtype=realtime&simple_means_flag=3&sign=${encodeURIComponent(sign)}&token=${encodeURIComponent(token)}`;
    let get = await fetch(new URL('https://fanyi.baidu.com/v2transapi'), { method: 'POST', body: postData, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData), 'Cookie': cookie } });
    let getBuf = await get.arrayBuffer();
    let chunk = Buffer.from(getBuf).toString();
    // 读入 JSON
    try {
        chunk = JSON.parse(chunk);
    } catch (ex) {
        conLog(ex, true);
    };
    let output = [];
    if (chunk.trans_result) {
        for (let result of chunk.trans_result.data) {
            output.push(result.dst);
        };
    };
    output = output.join('\n');
    return output;
};

const couplet = async (text) => {
    let get = await fetch(new URL(`https://ai-backend.binwang.me/chat/couplet/${encodeURIComponent(text)}`));
    let getBuf = await get.arrayBuffer();
    let chunk = Buffer.from(getBuf).toString();
    // 读入 JSON
    try {
        chunk = JSON.parse(chunk);
    } catch (ex) {
        conLog(ex, true);
    };
    return chunk.output;
};

const charCode = (str) => {
    const usv = (chr) => {
        let value = chr.codePointAt().toString(16).toUpperCase();
        if (value.length < 4) {
            return `U+${`000${value}`.slice(-4)}`;
        } else {
            return `U+${value}`;
        };
    };

    const buf2hex = (buf) => Buffer.from(buf).toString('hex').toUpperCase();

    const getCode = (str, encoding) => {
        let output = [];
        for (let chr of str) {
            if (encoding === 'USV') {
                output.push(usv(chr));
            } else {
                output.push(buf2hex(new TextEncoder(encoding).encode(chr)));
            };
        };
        return output.join(' ');
    };

    let output = [];

    output.push(str);
    output.push(`USV: ${getCode(str, 'USV')}`);
    output.push(`UTF-8: ${getCode(str, 'UTF-8')}`);
    output.push(`UTF-16 BE: ${getCode(str, 'UTF-16 BE')}`);
    output.push(`UTF-32 BE: ${getCode(str, 'UTF-32 BE')}`);
    output.push(`GB 18030-2005: ${getCode(str, 'GB 18030-2005')}`);
    output.push(`UTF-1: ${getCode(str, 'UTF-1')}`);

    return output.join('\n');
};

// 移植自 https://www.zhihu.com/question/402635037/answer/1302122540
// 做了繁简适配，顺带优化词库
const jiowjeh = (question) => {
    let forceUniversalAnswerRate = 0.13;

    let universalAnswers = [
        '你说你🐴呢？',
        '那没事了。',
        '真别逗我笑啊。',
        '那可真是有趣呢。',
        '就这？就这？',
        '你品，你细品。',
        '不会真有人觉得是这样的吧，不会吧不会吧？'
    ];
    let strongEmotionAnswers = [
        '你急了急了急了？',
        '他急了，他急了！'
    ];
    let questionAnswers = [
        '不会真有人还不知道吧？',
        '你都不知道，那你说你🐴呢？'
    ];

    let strongEmotionPatterns = [
        '[！!]',
        '[？?][？?][？?]',
        '[气氣]抖冷'
    ];
    let questionParrerns = [
        '[？?]',
        '怎[么麼]',
        '什[么麼]',
        '咋'
    ];

    const checkPatterns = (strIn, patterns) => {
        for (let p of patterns) {
            if (strIn.match(new RegExp(p, 'u'))) {
                return true;
            };
        };
        return false;
    };

    if (Math.random() < forceUniversalAnswerRate) {
        return arrayRandom(universalAnswers);
    } else if (checkPatterns(question, strongEmotionPatterns)) {
        return arrayRandom(strongEmotionAnswers);
    } else if (checkPatterns(question, questionParrerns)) {
        return arrayRandom(questionAnswers);
    } else {
        return arrayRandom(universalAnswers);
    };
};

// 移植自 https://github.com/Meeken1998/wtfurry
// 有男同性恋变态售壬控那味了吗？
const wtfurry = (sentence) => {
    let list = jieba.tag(sentence, true);
    let str = '';

    let i = 0;
    while (i < list.length) {
        try {
            if (list[i].tag === 'x' && list[i + 1].tag === 'x' && wtfurryIndy_s[list[i].tag][i].includes(list[i].word) && wtfurryIndy_s[list[i + 1].tag][i + 1].includes(list[i + 1].word)) {
                list[i].word = '';
            };
        } catch {};

        if (list[i] && list[i].tag && wtfurryDic[list[i].tag] && wtfurryDic[list[i].tag][list[i].word] && wtfurryDic[list[i].tag][list[i].word].length) {
            list[i].word = arrayRandom(wtfurryDic[list[i].tag][list[i].word]);
        };

        str += list[i].word;
        i += 1;
    };

    if (list && list[0] && list[0].tag && (list[0].tag === 'r' || list[0].tag === 'm')) {
        str = `${arrayRandom(wtfurryDic.emm)}${str}`;
    };

    return str;
};

// 移植自 https://github.com/mrhso/IshisashiWebsite/blob/master/%E4%B9%B1%E5%86%99%E7%A8%8B%E5%BC%8F/%E8%90%A5%E9%94%80%E5%8F%B7%EF%BC%8C%E5%A6%82%E7%B4%AB%E7%81%AB%E8%88%AC%E7%87%83%E7%83%A7.js
const yngshiau = async (event0, event1) => {
    let event = `${event0}${event1}`;
    let get = await fetch(new URL(`https://image.so.com/i?q=${encodeURIComponent(event)}&src=srp`));
    let getBuf = await get.arrayBuffer();
    let chunk = JSON.parse(Buffer.from(getBuf).toString().match(/<script type="text\/data" id="initData">(.*?)<\/script>/u)[1]);
    let imgs = chunk.list;
    // 随机抽取一张图片
    let img = imgs[Math.floor(Math.random() * imgs.length)].img;
    let filepath = path.join(cacheDir, Date.now().toString());
    let getImg = await fetch(new URL(img));
    let getImgBuf = await getImg.arrayBuffer();
    fs.writeFileSync(filepath, Buffer.from(getImgBuf));
    let template = `${qqbot.escape(event)}是怎么回事呢？${qqbot.escape(event)}相信大家都很熟悉，但是${qqbot.escape(event)}是怎么回事呢？下面就让小编带大家一起了解吧。\n${qqbot.escape(event)}，其实就是${qqbot.escape(event)}，大家可能会感到很惊讶，${qqbot.escape(event0)}怎么会${qqbot.escape(event1) || qqbot.escape(event0)}？但事实就是这样，小编也感到非常惊讶。\n[CQ:image,file=${qqbot.escape(filepath, true)}]\n那么这就是关于${qqbot.escape(event)}的事情了，大家有甚么想法呢？欢迎在评论区告诉小编一起讨论哦。`;
    return template;
};

// 老白提供 API
const zuzi = async (str) => {
    let get = await fetch(new URL(`http://zu.zi.tools/${encodeURIComponent(str)}.png`));
    if (get.status === 400) {
        return '非法语句！！';
    };
    let normalised = Buffer.from(get.headers.raw()['x-zi-tools-normalized-ids'][0], 'base64').toString();
    let matches = Buffer.from(get.headers.raw()['x-zi-tools-matches-characters'][0], 'base64').toString().split(' ').filter((value) => value);
    let getBuf = await get.arrayBuffer();
    let filepath = path.join(cacheDir, Date.now().toString());
    fs.writeFileSync(filepath, Buffer.from(getBuf));
    return `IDS: ${qqbot.escape(str)}\nNormalised IDS: ${qqbot.escape(normalised)}\n${matches.length > 0 ? `Matches character(s): ${matches.join(' / ')}\n` : ''}[CQ:image,file=${qqbot.escape(filepath, true)}]`;
};

const scoreRings = (mol) => {
    let score = 0;

    let ringSet = Cycles.sssrSync(mol).toRingSetSync();
    let ringCount = ringSet.getAtomContainerCountSync();
    let ringOffset = 0;
    while (ringOffset < ringCount) {
        let allC = true;
        let allAromatic = true;

        let ring = ringSet.getAtomContainerSync(ringOffset);

        let bondCount = ring.getBondCountSync();
        let bondOffset = 0;
        while (bondOffset < bondCount) {
            let bond = ring.getBondSync(bondOffset);

            if (!bond.isAromaticSync()) {
                allAromatic = false;
                break;
            };

            bondOffset += 1;
        };

        let atomCount = ring.getAtomCountSync();
        let atomOffset = 0;
        while (atomOffset < atomCount) {
            let atom = ring.getAtomSync(atomOffset);

            if (atom.getAtomicNumberSync() !== 6) {
                allC = false;
                break;
            };

            atomOffset += 1;
        };

        if (allAromatic) {
            score += 100;
            if (allC) {
                score += 150;
            };
        };

        ringOffset += 1;
    };

    return score;
};

const scoreSubstructs = (mol) => {
    let substructureTerms = [
        // benzoquinone
        ['[#6]1([#6]=[#6][#6]([#6]=[#6]1)=,:[N,S,O])=,:[N,S,O]', 25],
        // oxim
        ['[#6]=[N][OH]', 4],
        // C=O
        ['[#6]=,:[#8]', 2],
        // N=O
        ['[#7]=,:[#8]', 2],
        // P=O
        ['[#15]=,:[#8]', 2],
        // C=hetero
        ['[C]=[!#1;!#6]', 1],
        // C(=hetero)-hetero
        ['[C](=[!#1;!#6])[!#1;!#6]', 2],
        // aromatic C = exocyclic N
        ['[c]=!@[N]', -1],
        // methyl
        ['[CX4H3]', 1],
        // guanidine terminal=N
        ['[#7]C(=[NR0])[#7H0]', 1],
        // guanidine endocyclic=N
        ['[#7;R][#6;R]([N])=[#7;R]', 2],
        // aci-nitro
        ['[#6]=[N+]([O-])[OH]', -4]
    ];

    let score = 0;

    for (let [smarts, termScore] of substructureTerms) {
        let matches = SmartsPattern.createSync(smarts).matchAllSync(mol);
        score += matches.countSync() * termScore;
    };

    return score;
};

const scoreHeteroHs = (mol) => {
    let score = 0;

    let atomCount = mol.getAtomCountSync();
    let atomOffset = 0;
    while (atomOffset < atomCount) {
        let atom = mol.getAtomSync(atomOffset);

        let anum = atom.getAtomicNumberSync();
        if (anum === 15 || anum === 16 || anum === 34 || anum === 52) {
            score -= AtomContainerManipulator.countHydrogensSync(mol, atom);
        };

        atomOffset += 1;
    };

    return score;
};

const scoreTautomer = (mol) => scoreRings(mol) + scoreSubstructs(mol) + scoreHeteroHs(mol);

const pickCanonical = (tautomers) => {
    let bestMol;

    let tautomerCount = tautomers.sizeSync();

    if (tautomerCount === 1) {
        bestMol = tautomers.getSync(0);
    } else {
        let bestScore = -Infinity;
        let bestSmiles = '';

        let aromaticity = new Aromaticity(ElectronDonation.daylightSync(), Cycles.allSync());
        let smilesGen = new SmilesGenerator(SmiFlavor.Absolute | SmiFlavor.UseAromaticSymbols);

        let tautomerOffset = 0;
        while (tautomerOffset < tautomerCount) {
            let tautomer = tautomers.getSync(tautomerOffset);

            AtomContainerManipulator.convertImplicitToExplicitHydrogensSync(tautomer);
            aromaticity.apply(tautomer);

            let score = scoreTautomer(tautomer);
            let smiles = RDKitModule.get_mol(smilesGen.createSync(tautomer)).get_smiles();
            if (score > bestScore) {
                bestScore = score;
                bestSmiles = smiles;
                bestMol = tautomer;
            } else if (score === bestScore) {
                if (smiles < bestSmiles) {
                    bestSmiles = smiles;
                    bestMol = tautomer;
                };
            };

            tautomerOffset += 1;
        };
    };

    return AtomContainerManipulator.removeHydrogensSync(bestMol);
};

// 使用 CDK 读取 InChI
const inchi2img = async (str) => {
    let arr = str.split('\n');
    let output = '';
    let tautomerGenerator = new InChITautomerGenerator();
    let depictionGenerator = new DepictionGenerator().withSizeSync(DepictionGenerator.AUTOMATIC, DepictionGenerator.AUTOMATIC).withFillToFitSync().withZoomSync(2.5);
    for (let inchi of arr) {
        let mol = InChIGeneratorFactory.getInstanceSync().getInChIToStructureSync(inchi, SilentChemObjectBuilder.getInstanceSync()).getAtomContainerSync();
        if (!mol.isEmptySync()) {
            AtomContainerManipulator.percieveAtomTypesAndConfigureAtomsSync(mol);
            let tautomers = tautomerGenerator.getTautomersSync(mol, inchi);
            mol = pickCanonical(tautomers);
            let svg = Buffer.from(depictionGenerator.depictSync(mol).toSvgStrSync());
            let filepath = path.join(cacheDir, Date.now().toString());
            await sharp(svg).toFile(filepath);
            output += `[CQ:image,file=${qqbot.escape(filepath, true)}]`;
        } else {
            output+= '&#91;非法语句！！&#93;';
        };
    };
    return output;
};

// 字元组字の诱惑
const ichara = async (str) => {
    if (!str) {
        let getHTML = await fetch(new URL('https://www.ichara.cn/web/yunlizaoziweb/randCharaView.php?showids=yes'));
        let getHTMLBuf = await getHTML.arrayBuffer();
        let html = Buffer.from(getHTMLBuf).toString();
        str = html.match(/target='_BLANK'>(.*?)</u)[1];
    };
    let get = await fetch(new URL(`https://www.ichara.cn/web/yunlizaoziweb/createPng.php?str=${encodeURIComponent(str)}&fontcolor=000000&area=G&dbname=ids&idsname=idslte&bgimgpath=blank`));
    let getBuf = await get.arrayBuffer();
    let filepath = path.join(cacheDir, Date.now().toString());
    fs.writeFileSync(filepath, Buffer.from(getBuf));
    return `${str}\n[CQ:image,file=${qqbot.escape(filepath, true)}]`;
};

let modeList = '可切换模式列表：chishoh、AIxxz、pet、gong、kufon、gt、gtRound、couplet、code、bf、bfRound、jiowjeh、wtfurry、yngshiau、zuzi、inchi2img、ichara';
let version = '智障 Bot 1.8.8\n지장 보트 1.8.8\n\nIshisashi 版权所无\n\n《지장 보트》는 조선민주주의인민공화국 쏘프트웨어법에 의하여 보호되고 없습니다.\n\n广告：\nIshisashi Kisulbu，诚聘技术售人控';
// 群聊
qqbot.on('GroupMessage', async (rawdata) => {
    if (config.pModeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').match(new RegExp(config.pModeSwitch, 'u'))) {
        let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').replace(new RegExp(config.pModeSwitch, 'gu'), '')).text;
        if (newMode) {
            pMode[rawdata.from] = newMode;
            reply(rawdata, `已切换单 QQ 模式至「${newMode}」。`);
            writeConfig(pMode, './data/mode.private.js');
        } else {
            pMode[rawdata.from] = undefined;
            reply(rawdata, `已清除单 QQ 模式。\n${modeList}`);
            writeConfig(pMode, './data/mode.private.js');
        };
    } else if (config.gModeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').match(new RegExp(config.gModeSwitch, 'u'))) {
        let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').replace(new RegExp(config.gModeSwitch, 'gu'), '')).text;
        if (newMode) {
            gMode[rawdata.group] = newMode;
            reply(rawdata, `已切换单群模式至「${newMode}」。`);
            writeConfig(gMode, './data/mode.group.js');
        } else {
            gMode[rawdata.group] = undefined;
            reply(rawdata, `已清除单群模式。\n${modeList}`);
            writeConfig(gMode, './data/mode.group.js');
        };
    } else if (config.modeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').match(new RegExp(config.modeSwitch, 'u'))) {
        let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').replace(new RegExp(config.modeSwitch, 'gu'), '')).text;
        if (newMode) {
            config.mode = newMode;
            reply(rawdata, `已切换全局模式至「${newMode}」。`);
            writeConfig(config, './config.js');
        } else {
            let current = [];
            if (pMode[rawdata.from]) {
                current.push(`单 QQ 模式为「${pMode[rawdata.from]}」`);
            };
            if (gMode[rawdata.group]) {
                current.push(`单群模式为「${gMode[rawdata.group]}」`);
            };
            current.push(`全局模式为「${config.mode}」`);
            current = `当前${current.join('，')}。`;
            reply(rawdata, `${current}\n${modeList}`);
        };
    } else if (config.forceWriteSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').match(new RegExp(config.forceWriteSwitch, 'u'))) {
        try {
            fs.accessSync('./data/');
        } catch (err) {
            try {
                fs.mkdirSync('./data/');
            } catch (err) {
                conLog(`Failed to create data directory`, true);
            };
        };
        writeConfig(config, './config.js');
        writeConfig(pMode, './data/mode.private.js');
        writeConfig(gMode, './data/mode.group.js');
        writeConfig(petList, './data/pet.list.js');
        writeConfig(pGt, './data/gt.private.js');
        writeConfig(gGt, './data/gt.group.js');
        writeConfig(pAIxxz, './data/AIxxz.private.js');
        writeConfig(gAIxxz, './data/AIxxz.group.js');
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
        reply(rawdata, '所有数据已强制写入。');
    } else if (config.version && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').match(new RegExp(config.version, 'u'))) {
        reply(rawdata, version);
    } else {
        let mode;
        if (pMode[rawdata.from]) {
            mode = pMode[rawdata.from];
        } else if (gMode[rawdata.group]) {
            mode = gMode[rawdata.group];
        } else {
            mode = config.mode;
        };
        switch (mode) {
            // 人工智障（Jinkō Chishō），现代日本语与「人工池沼」同音
            // 或许也可以用国语罗马字，叫 Rengong Jyhjanq，甚至 Rengong Chyrjao
            case 'chishoh':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    let answer = jinkohChishoh(question);
                    reply(rawdata, answer, { noEscape: true });
                };
                break;

            // 小信子，真·人工池沼
            case 'AIxxz':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pLangSwitch && question.match(new RegExp(config.pLangSwitch, 'u'))) {
                        pAIxxz[rawdata.from] = pAIxxz[rawdata.from] || {};
                        let newLang = qqbot.parseMessage(question.replace(new RegExp(config.pLangSwitch, 'gu'), '')).text;
                        if (newLang) {
                            pAIxxz[rawdata.from].lang = newLang;
                            reply(rawdata, `已切换单 QQ 语文至「${newLang}」。`);
                            writeConfig(pAIxxz, './data/AIxxz.private.js');
                        } else {
                            pAIxxz[rawdata.from].lang = undefined;
                            reply(rawdata, `已清除单 QQ 语文。`);
                            writeConfig(pAIxxz, './data/AIxxz.private.js');
                        };
                    } else if (config.pCitySwitch && question.match(new RegExp(config.pCitySwitch, 'u'))) {
                        pAIxxz[rawdata.from] = pAIxxz[rawdata.from] || {};
                        let newCity = qqbot.parseMessage(question.replace(new RegExp(config.pCitySwitch, 'gu'), '')).text;
                        if (newCity) {
                            pAIxxz[rawdata.from].city = newCity;
                            reply(rawdata, `已切换单 QQ 城市至「${newCity}」。`);
                            writeConfig(pAIxxz, './data/AIxxz.private.js');
                        } else {
                            pAIxxz[rawdata.from].city = undefined;
                            reply(rawdata, `已清除单 QQ 城市。`);
                            writeConfig(pAIxxz, './data/AIxxz.private.js');
                        };
                    } else if (config.gLangSwitch && question.match(new RegExp(config.gLangSwitch, 'u'))) {
                        gAIxxz[rawdata.group] = gAIxxz[rawdata.group] || {};
                        let newLang = qqbot.parseMessage(question.replace(new RegExp(config.gLangSwitch, 'gu'), '')).text;
                        if (newLang) {
                            gAIxxz[rawdata.group].lang = newLang;
                            reply(rawdata, `已切换单群语文至「${newLang}」。`);
                            writeConfig(gAIxxz, './data/AIxxz.group.js');
                        } else {
                            gAIxxz[rawdata.group].lang = undefined;
                            reply(rawdata, `已清除单群语文。`);
                            writeConfig(gAIxxz, './data/AIxxz.group.js');
                        };
                    } else if (config.gCitySwitch && question.match(new RegExp(config.gCitySwitch, 'u'))) {
                        gAIxxz[rawdata.group] = gAIxxz[rawdata.group] || {};
                        let newCity = qqbot.parseMessage(question.replace(new RegExp(config.gCitySwitch, 'gu'), '')).text;
                        if (newCity) {
                            gAIxxz[rawdata.group].city = newCity;
                            reply(rawdata, `已切换单群城市至「${newCity}」。`);
                            writeConfig(gAIxxz, './data/AIxxz.group.js');
                        } else {
                            gAIxxz[rawdata.group].city = undefined;
                            reply(rawdata, `已清除单群城市。`);
                            writeConfig(gAIxxz, './data/AIxxz.group.js');
                        };
                    } else if (config.langSwitch && question.match(new RegExp(config.langSwitch, 'u'))) {
                        let newLang = qqbot.parseMessage(question.replace(new RegExp(config.langSwitch, 'gu'), '')).text;
                        if (newLang) {
                            config.lang = newLang;
                            reply(rawdata, `已切换全局语文至「${newLang}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].lang) {
                                current.push(`单 QQ 语文为「${pAIxxz[rawdata.from].lang}」`);
                            };
                            if (gAIxxz[rawdata.group] && gAIxxz[rawdata.group].lang) {
                                current.push(`单群语文为「${gAIxxz[rawdata.group].lang}」`);
                            };
                            current.push(`全局语文为「${config.lang}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.citySwitch && question.match(new RegExp(config.citySwitch, 'u'))) {
                        let newCity = qqbot.parseMessage(question.replace(new RegExp(config.citySwitch, 'gu'), '')).text;
                        if (newCity) {
                            config.city = newCity;
                            reply(rawdata, `已切换全局城市至「${newCity}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].city) {
                                current.push(`单 QQ 城市为「${pAIxxz[rawdata.from].city}」`);
                            };
                            if (gAIxxz[rawdata.group] && gAIxxz[rawdata.group].city) {
                                current.push(`单群城市为「${gAIxxz[rawdata.group].city}」`);
                            };
                            current.push(`全局城市为「${config.city}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else {
                        let lang;
                        let city;
                        if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].lang) {
                            lang = pAIxxz[rawdata.from].lang;
                        } else if (gAIxxz[rawdata.group] && gAIxxz[rawdata.group].lang) {
                            lang = gAIxxz[rawdata.group].lang;
                        } else {
                            lang = config.lang || 'zh-CN';
                        };
                        if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].city) {
                            city = pAIxxz[rawdata.from].city;
                        } else if (gAIxxz[rawdata.group] && gAIxxz[rawdata.group].city) {
                            city = gAIxxz[rawdata.group].city;
                        } else {
                            city = config.city || '';
                        };
                        question = qqbot.parseMessage(question).text;
                        AIxxz(rawdata, question, lang, city, (answer) => {
                            reply(rawdata, answer, { noEscape: true });
                        });
                    };
                };
                break;

            // 某致郁游戏，复活一时爽，一直复活一直爽
            case 'pet':
                if (rawdata.extra.ats.includes(botQQ) || rawdata.raw.match(/\[CQ:hb,.*?\]/u)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    let output = pet(rawdata.from, input);
                    reply(rawdata, output, { noEscape: true });
                // 即使没有 at 机器人，也有 0.5% 概率触发随机死亡
                } else if (Math.random() < 0.005) {
                    // 不用送输入了，反正要死
                    let output = pet(rawdata.from, '', true);
                    reply(rawdata, output, { noEscape: true });
                };
                break;

            // AlphaGong 龚诗生成器
            case 'gong':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let gong = alphaGong();
                    reply(rawdata, gong);
                };
                break;

            // AlphaKufon Zero 迫真古风生成器
            case 'kufon':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let kufon = alphaKufonZero();
                    reply(rawdata, kufon);
                };
                break;

            // Google 翻译
            case 'gt':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            pGt[rawdata.from].src = newSrc;
                            reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.match(new RegExp(config.gGtSrcSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            gGt[rawdata.group].src = newSrc;
                            reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].src = undefined;
                            reply(rawdata, `已清除单群源语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtTgtSwitch && input.match(new RegExp(config.gGtTgtSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].tgt = undefined;
                            reply(rawdata, `已清除单群目标语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtSwapSwitch && input.match(new RegExp(config.gGtSwapSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            config.gtSrc = newSrc;
                            reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                                current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                                current.push(`单群源语文为「${gGt[rawdata.group].src}」`);
                            };
                            current.push(`全局源语文为「${config.gtSrc}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            config.gtTgt = newTgt;
                            reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                                current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                                current.push(`单群目标语文为「${gGt[rawdata.group].tgt}」`);
                            };
                            current.push(`全局目标语文为「${config.gtTgt}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                        let newSrc = config.gtTgt;
                        let newTgt = config.gtSrc;
                        config.gtSrc = newSrc;
                        config.gtTgt = newTgt;
                        reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let src;
                        let tgt;
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            src = pGt[rawdata.from].src;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                            src = gGt[rawdata.group].src;
                        } else {
                            src = config.gtSrc || 'auto';
                        };
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            tgt = pGt[rawdata.from].tgt;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                            tgt = gGt[rawdata.group].tgt;
                        } else {
                            tgt = config.gtTgt || 'en';
                        };
                        input = qqbot.parseMessage(input).text;
                        let output = await googleTranslate(input, src, tgt);
                        reply(rawdata, output);
                    };
                };
                break;

            // Google 来回翻译，翻译过去再翻译回来
            // 一个来回就面目全非了 www
            case 'gtRound':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            pGt[rawdata.from].src = newSrc;
                            reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.match(new RegExp(config.gGtSrcSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            gGt[rawdata.group].src = newSrc;
                            reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].src = undefined;
                            reply(rawdata, `已清除单群源语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtTgtSwitch && input.match(new RegExp(config.gGtTgtSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].tgt = undefined;
                            reply(rawdata, `已清除单群目标语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtSwapSwitch && input.match(new RegExp(config.gGtSwapSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            config.gtSrc = newSrc;
                            reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                                current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                                current.push(`单群源语文为「${gGt[rawdata.group].src}」`);
                            };
                            current.push(`全局源语文为「${config.gtSrc}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            config.gtTgt = newTgt;
                            reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                                current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                                current.push(`单群目标语文为「${gGt[rawdata.group].tgt}」`);
                            };
                            current.push(`全局目标语文为「${config.gtTgt}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                        let newSrc = config.gtTgt;
                        let newTgt = config.gtSrc;
                        config.gtSrc = newSrc;
                        config.gtTgt = newTgt;
                        reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let src;
                        let tgt;
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            src = pGt[rawdata.from].src;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                            src = gGt[rawdata.group].src;
                        } else {
                            src = config.gtSrc || 'auto';
                        };
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            tgt = pGt[rawdata.from].tgt;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                            tgt = gGt[rawdata.group].tgt;
                        } else {
                            tgt = config.gtTgt || 'en';
                        };
                        input = qqbot.parseMessage(input).text;
                        let output = await googleTranslate(input, src, tgt);
                        output = await googleTranslate(output, tgt, src);
                        reply(rawdata, output);
                    };
                };
                break;

            // 对对联
            // 就是那个 https://ai.binwang.me/couplet/，好像很火的样子
            case 'couplet':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    let output = await couplet(input);
                    reply(rawdata, output);
                };
                break;

            case 'code':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let str = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    let code = charCode(str);
                    reply(rawdata, code);
                };
                break;

            // 百度翻译
            case 'bf':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            pGt[rawdata.from].src = newSrc;
                            reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.match(new RegExp(config.gGtSrcSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            gGt[rawdata.group].src = newSrc;
                            reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].src = undefined;
                            reply(rawdata, `已清除单群源语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtTgtSwitch && input.match(new RegExp(config.gGtTgtSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].tgt = undefined;
                            reply(rawdata, `已清除单群目标语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtSwapSwitch && input.match(new RegExp(config.gGtSwapSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            config.gtSrc = newSrc;
                            reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                                current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                                current.push(`单群源语文为「${gGt[rawdata.group].src}」`);
                            };
                            current.push(`全局源语文为「${config.gtSrc}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            config.gtTgt = newTgt;
                            reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                                current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                                current.push(`单群目标语文为「${gGt[rawdata.group].tgt}」`);
                            };
                            current.push(`全局目标语文为「${config.gtTgt}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                        let newSrc = config.gtTgt;
                        let newTgt = config.gtSrc;
                        config.gtSrc = newSrc;
                        config.gtTgt = newTgt;
                        reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let src;
                        let tgt;
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            src = pGt[rawdata.from].src;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                            src = gGt[rawdata.group].src;
                        } else {
                            src = config.gtSrc || 'auto';
                        };
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            tgt = pGt[rawdata.from].tgt;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                            tgt = gGt[rawdata.group].tgt;
                        } else {
                            tgt = config.gtTgt || 'en';
                        };
                        input = qqbot.parseMessage(input).text;
                        let output = await baiduFanyi(input, src, tgt);
                        reply(rawdata, output);
                    };
                };
                break;

            // 百度来回翻译
            case 'bfRound':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            pGt[rawdata.from].src = newSrc;
                            reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './data/gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './data/gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.match(new RegExp(config.gGtSrcSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            gGt[rawdata.group].src = newSrc;
                            reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].src = undefined;
                            reply(rawdata, `已清除单群源语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtTgtSwitch && input.match(new RegExp(config.gGtTgtSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                            writeConfig(gGt, './data/gt.group.js');
                        } else {
                            gGt[rawdata.group].tgt = undefined;
                            reply(rawdata, `已清除单群目标语文。`);
                            writeConfig(gGt, './data/gt.group.js');
                        };
                    } else if (config.gGtSwapSwitch && input.match(new RegExp(config.gGtSwapSwitch, 'u'))) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            config.gtSrc = newSrc;
                            reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                                current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                                current.push(`单群源语文为「${gGt[rawdata.group].src}」`);
                            };
                            current.push(`全局源语文为「${config.gtSrc}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            config.gtTgt = newTgt;
                            reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                                current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                            };
                            if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                                current.push(`单群目标语文为「${gGt[rawdata.group].tgt}」`);
                            };
                            current.push(`全局目标语文为「${config.gtTgt}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                        let newSrc = config.gtTgt;
                        let newTgt = config.gtSrc;
                        config.gtSrc = newSrc;
                        config.gtTgt = newTgt;
                        reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let src;
                        let tgt;
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            src = pGt[rawdata.from].src;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].src) {
                            src = gGt[rawdata.group].src;
                        } else {
                            src = config.gtSrc || 'auto';
                        };
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            tgt = pGt[rawdata.from].tgt;
                        } else if (gGt[rawdata.group] && gGt[rawdata.group].tgt) {
                            tgt = gGt[rawdata.group].tgt;
                        } else {
                            tgt = config.gtTgt || 'en';
                        };
                        input = qqbot.parseMessage(input).text;
                        let output = await baiduFanyi(input, src, tgt);
                        output = await baiduFanyi(output, tgt, src);
                        reply(rawdata, output);
                    };
                };
                break;

            // 阴阳怪气
            // 就这？
            case 'jiowjeh':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    let answer = jiowjeh(question);
                    reply(rawdata, answer, { noEscape: true });
                };
                break;

            // 售壬控模拟器
            case 'wtfurry':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let sentence = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    let str = wtfurry(sentence);
                    reply(rawdata, str, { noEscape: true });
                };
                break;

            // 营销号，如紫火般燃烧
            case 'yngshiau':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let events = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text.split('\n').filter((value) => value);
                    let template = await yngshiau(events[0] || '', events[1] || '');
                    reply(rawdata, template, { noEscape: true });
                };
                break;

            // 动态组字
            case 'zuzi':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let str = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    let output = await zuzi(str);
                    reply(rawdata, output, { noEscape: true });
                };
                break;

            // InChI 转结构
            case 'inchi2img':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let str = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    let output = await inchi2img(str);
                    reply(rawdata, output, { noEscape: true });
                };
                break;

            // 字元组字
            case 'ichara':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let str = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    let output = await ichara(str);
                    reply(rawdata, output, { noEscape: true });
                };
                break;

            default:
                if (rawdata.extra.ats.includes(botQQ)) {
                    reply(rawdata, '当前模式不存在，请检查设定。');
                };
                break;
        };
    };
});
// 私聊
qqbot.on('PrivateMessage', async (rawdata) => {
    if (config.pModeSwitch && rawdata.raw.match(new RegExp(config.pModeSwitch, 'u'))) {
        let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(config.pModeSwitch, 'gu'), '')).text;
        if (newMode) {
            pMode[rawdata.from] = newMode;
            reply(rawdata, `已切换单 QQ 模式至「${newMode}」。`);
            writeConfig(pMode, './data/mode.private.js');
        } else {
            pMode[rawdata.from] = undefined;
            reply(rawdata, `已清除单 QQ 模式。\n${modeList}`);
            writeConfig(pMode, './data/mode.private.js');
        };
    } else if (config.modeSwitch && rawdata.raw.match(new RegExp(config.modeSwitch, 'u'))) {
        let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(config.modeSwitch, 'gu'), '')).text;
        if (newMode) {
            config.mode = newMode;
            reply(rawdata, `已切换全局模式至「${newMode}」。`);
            writeConfig(config, './config.js');
        } else {
            let current = [];
            if (pMode[rawdata.from]) {
                current.push(`单 QQ 模式为「${pMode[rawdata.from]}」`);
            };
            current.push(`全局模式为「${config.mode}」`);
            current = `当前${current.join('，')}。`;
            reply(rawdata, `${current}\n${modeList}`);
        };
    } else if (config.forceWriteSwitch && rawdata.raw.match(new RegExp(config.forceWriteSwitch, 'u'))) {
        try {
            fs.accessSync('./data/');
        } catch (err) {
            try {
                fs.mkdirSync('./data/');
            } catch (err) {
                conLog(`Failed to create data directory`, true);
            };
        };
        writeConfig(config, './config.js');
        writeConfig(pMode, './data/mode.private.js');
        writeConfig(gMode, './data/mode.group.js');
        writeConfig(petList, './data/pet.list.js');
        writeConfig(pGt, './data/gt.private.js');
        writeConfig(gGt, './data/gt.group.js');
        writeConfig(pAIxxz, './data/AIxxz.private.js');
        writeConfig(gAIxxz, './data/AIxxz.group.js');
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
        reply(rawdata, '所有数据已强制写入。');
    } else if (config.version && rawdata.raw.match(new RegExp(config.version, 'u'))) {
        reply(rawdata, version);
    } else {
        let mode;
        if (pMode[rawdata.from]) {
            mode = pMode[rawdata.from];
        } else {
            mode = config.mode;
        };
        let question;
        let input;
        let str;
        let output;
        let answer;
        switch (mode) {
            case 'chishoh':
                question = rawdata.raw;
                answer = jinkohChishoh(question);
                reply(rawdata, answer, { noEscape: true });
                break;

            case 'AIxxz':
                question = rawdata.raw;
                if (config.pLangSwitch && question.match(new RegExp(config.pLangSwitch, 'u'))) {
                    pAIxxz[rawdata.from] = pAIxxz[rawdata.from] || {};
                    let newLang = qqbot.parseMessage(question.replace(new RegExp(config.pLangSwitch, 'gu'), '')).text;
                    if (newLang) {
                        pAIxxz[rawdata.from].lang = newLang;
                        reply(rawdata, `已切换单 QQ 语文至「${newLang}」。`);
                        writeConfig(pAIxxz, './data/AIxxz.private.js');
                    } else {
                        pAIxxz[rawdata.from].lang = undefined;
                        reply(rawdata, `已清除单 QQ 语文。`);
                        writeConfig(pAIxxz, './data/AIxxz.private.js');
                    };
                } else if (config.pCitySwitch && question.match(new RegExp(config.pCitySwitch, 'u'))) {
                    pAIxxz[rawdata.from] = pAIxxz[rawdata.from] || {};
                    let newCity = qqbot.parseMessage(question.replace(new RegExp(config.pCitySwitch, 'gu'), '')).text;
                    if (newCity) {
                        pAIxxz[rawdata.from].city = newCity;
                        reply(rawdata, `已切换单 QQ 城市至「${newCity}」。`);
                        writeConfig(pAIxxz, './data/AIxxz.private.js');
                    } else {
                        pAIxxz[rawdata.from].city = undefined;
                        reply(rawdata, `已清除单 QQ 城市。`);
                        writeConfig(pAIxxz, './data/AIxxz.private.js');
                    };
                } else if (config.langSwitch && question.match(new RegExp(config.langSwitch, 'u'))) {
                    let newLang = qqbot.parseMessage(question.replace(new RegExp(config.langSwitch, 'gu'), '')).text;
                    if (newLang) {
                        config.lang = newLang;
                        reply(rawdata, `已切换全局语文至「${newLang}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].lang) {
                            current.push(`单 QQ 语文为「${pAIxxz[rawdata.from].lang}」`);
                        };
                        current.push(`全局语文为「${config.lang}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.citySwitch && question.match(new RegExp(config.citySwitch, 'u'))) {
                    let newCity = qqbot.parseMessage(question.replace(new RegExp(config.citySwitch, 'gu'), '')).text;
                    if (newCity) {
                        config.city = newCity;
                        reply(rawdata, `已切换全局城市至「${newCity}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].city) {
                            current.push(`单 QQ 城市为「${pAIxxz[rawdata.from].city}」`);
                        };
                        current.push(`全局城市为「${config.city}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else {
                    let lang;
                    let city;
                    if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].lang) {
                        lang = pAIxxz[rawdata.from].lang;
                    } else {
                        lang = config.lang || 'zh-CN';
                    };
                    if (pAIxxz[rawdata.from] && pAIxxz[rawdata.from].city) {
                        city = pAIxxz[rawdata.from].city;
                    } else {
                        city = config.city || '';
                    };
                    question = qqbot.parseMessage(question).text;
                    AIxxz(rawdata, question, lang, city, (answer) => {
                        reply(rawdata, answer, { noEscape: true });
                    });
                };
                break;

            case 'pet':
                input = rawdata.raw;
                output = pet(rawdata.from, input);
                reply(rawdata, output, { noEscape: true });
                break;

            case 'gong':
                let gong = alphaGong();
                reply(rawdata, gong);
                break;

            case 'kufon':
                let kufon = alphaKufonZero();
                reply(rawdata, kufon);
                break;

            case 'gt':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        pGt[rawdata.from].src = newSrc;
                        reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].src = undefined;
                        reply(rawdata, `已清除单 QQ 源语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].tgt = undefined;
                        reply(rawdata, `已清除单 QQ 目标语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        config.gtSrc = newSrc;
                        reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                        };
                        current.push(`全局源语文为「${config.gtSrc}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        config.gtTgt = newTgt;
                        reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                        };
                        current.push(`全局目标语文为「${config.gtTgt}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                    let newSrc = config.gtTgt;
                    let newTgt = config.gtSrc;
                    config.gtSrc = newSrc;
                    config.gtTgt = newTgt;
                    reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                    writeConfig(config, './config.js');
                } else {
                    let src;
                    let tgt;
                    if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                        src = pGt[rawdata.from].src;
                    } else {
                        src = config.gtSrc || 'auto';
                    };
                    if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                        tgt = pGt[rawdata.from].tgt;
                    } else {
                        tgt = config.gtTgt || 'en';
                    };
                    input = qqbot.parseMessage(input).text;
                    output = await googleTranslate(input, src, tgt);
                    reply(rawdata, output);
                };
                break;

            case 'gtRound':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        pGt[rawdata.from].src = newSrc;
                        reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].src = undefined;
                        reply(rawdata, `已清除单 QQ 源语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].tgt = undefined;
                        reply(rawdata, `已清除单 QQ 目标语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        config.gtSrc = newSrc;
                        reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                        };
                        current.push(`全局源语文为「${config.gtSrc}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        config.gtTgt = newTgt;
                        reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                        };
                        current.push(`全局目标语文为「${config.gtTgt}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                    let newSrc = config.gtTgt;
                    let newTgt = config.gtSrc;
                    config.gtSrc = newSrc;
                    config.gtTgt = newTgt;
                    reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                    writeConfig(config, './config.js');
                } else {
                    let src;
                    let tgt;
                    if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                        src = pGt[rawdata.from].src;
                    } else {
                        src = config.gtSrc || 'auto';
                    };
                    if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                        tgt = pGt[rawdata.from].tgt;
                    } else {
                        tgt = config.gtTgt || 'en';
                    };
                    input = qqbot.parseMessage(input).text;
                    output = await googleTranslate(input, src, tgt);
                    output = await googleTranslate(output, tgt, src);
                    reply(rawdata, output);
                };
                break;

            case 'couplet':
                input = rawdata.text;
                output = await couplet(input);
                reply(rawdata, output);
                break;

            case 'code':
                str = rawdata.text;
                let code = charCode(str);
                reply(rawdata, code);
                break;

            case 'bf':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        pGt[rawdata.from].src = newSrc;
                        reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].src = undefined;
                        reply(rawdata, `已清除单 QQ 源语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].tgt = undefined;
                        reply(rawdata, `已清除单 QQ 目标语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        config.gtSrc = newSrc;
                        reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                        };
                        current.push(`全局源语文为「${config.gtSrc}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        config.gtTgt = newTgt;
                        reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                        };
                        current.push(`全局目标语文为「${config.gtTgt}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                    let newSrc = config.gtTgt;
                    let newTgt = config.gtSrc;
                    config.gtSrc = newSrc;
                    config.gtTgt = newTgt;
                    reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                    writeConfig(config, './config.js');
                } else {
                    let src;
                    let tgt;
                    if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                        src = pGt[rawdata.from].src;
                    } else {
                        src = config.gtSrc || 'auto';
                    };
                    if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                        tgt = pGt[rawdata.from].tgt;
                    } else {
                        tgt = config.gtTgt || 'en';
                    };
                    input = qqbot.parseMessage(input).text;
                    output = await baiduFanyi(input, src, tgt);
                    reply(rawdata, output);
                };
                break;

            case 'bfRound':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.match(new RegExp(config.pGtSrcSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        pGt[rawdata.from].src = newSrc;
                        reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].src = undefined;
                        reply(rawdata, `已清除单 QQ 源语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtTgtSwitch && input.match(new RegExp(config.pGtTgtSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else {
                        pGt[rawdata.from].tgt = undefined;
                        reply(rawdata, `已清除单 QQ 目标语文。`);
                        writeConfig(pGt, './data/gt.private.js');
                    };
                } else if (config.pGtSwapSwitch && input.match(new RegExp(config.pGtSwapSwitch, 'u'))) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.match(new RegExp(config.gtSrcSwitch, 'u'))) {
                    let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                    if (newSrc) {
                        config.gtSrc = newSrc;
                        reply(rawdata, `已切换全局源语文至「${newSrc}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                            current.push(`单 QQ 源语文为「${pGt[rawdata.from].src}」`);
                        };
                        current.push(`全局源语文为「${config.gtSrc}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtTgtSwitch && input.match(new RegExp(config.gtTgtSwitch, 'u'))) {
                    let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                    if (newTgt) {
                        config.gtTgt = newTgt;
                        reply(rawdata, `已切换全局目标语文至「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                            current.push(`单 QQ 目标语文为「${pGt[rawdata.from].tgt}」`);
                        };
                        current.push(`全局目标语文为「${config.gtTgt}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.gtSwapSwitch && input.match(new RegExp(config.gtSwapSwitch, 'u'))) {
                    let newSrc = config.gtTgt;
                    let newTgt = config.gtSrc;
                    config.gtSrc = newSrc;
                    config.gtTgt = newTgt;
                    reply(rawdata, `已交换全局源语文与全局目标语文。\n现在全局源语文为「${newSrc}」，全局目标语文为「${newTgt}」。`);
                    writeConfig(config, './config.js');
                } else {
                    let src;
                    let tgt;
                    if (pGt[rawdata.from] && pGt[rawdata.from].src) {
                        src = pGt[rawdata.from].src;
                    } else {
                        src = config.gtSrc || 'auto';
                    };
                    if (pGt[rawdata.from] && pGt[rawdata.from].tgt) {
                        tgt = pGt[rawdata.from].tgt;
                    } else {
                        tgt = config.gtTgt || 'en';
                    };
                    input = qqbot.parseMessage(input).text;
                    output = await baiduFanyi(input, src, tgt);
                    output = await baiduFanyi(output, tgt, src);
                    reply(rawdata, output);
                };
                break;

            case 'jiowjeh':
                question = rawdata.raw;
                answer = jiowjeh(question);
                reply(rawdata, answer, { noEscape: true });
                break;

            case 'wtfurry':
                let sentence = rawdata.raw;
                str = wtfurry(sentence);
                reply(rawdata, str, { noEscape: true });
                break;

            case 'yngshiau':
                let events = rawdata.text.split('\n').filter((value) => value);
                let template = await yngshiau(events[0] || '', events[1] || '');
                reply(rawdata, template, { noEscape: true });
                break;

            case 'zuzi':
                str = rawdata.text;
                output = await zuzi(str);
                reply(rawdata, output, { noEscape: true });
                break;

            case 'inchi2img':
                str = rawdata.text;
                output = await inchi2img(str);
                reply(rawdata, output, { noEscape: true });
                break;

            case 'ichara':
                str = rawdata.text;
                output = await ichara(str);
                reply(rawdata, output, { noEscape: true });
                break;

            default:
                reply(rawdata, '当前模式不存在，请检查设定。');
                break;
        };
    };
});
