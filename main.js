'use strict';

const QQBot = require('./lib/QQBot.js');
const { toLF, toCRLF, TextEncoder } = require('ishisashiencoding');
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');
const OpenCC = require('./lib/OpenCC/opencc.js');
const { v4: uuidv4 } = require('uuid');
const jieba = require('nodejieba');

const config = require('./config.js');
const pMode = require('./data/mode.private.js');
const gMode = require('./data/mode.group.js');

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
qqbot.on('ServerHello', (rawdata) => {
    qqbot.loginQQ();
});
qqbot.on('LoginQQ', (rawdata) => {
    botQQ = rawdata;
});

/* let penshern = [];
let penshernCopy = [];
try {
    penshern = require('./text/text.js');
} catch (ex) {
    conLog('Failed to load text.js', true);
}; */

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

const poems = [];
const allPairs = [];
let pPoem = {};
let gPoem = {};
try {
    const shyjing = toLF(fs.readFileSync('./text/詩經.txt').toString());
    const tarngshySanbaeShoou = toLF(fs.readFileSync('./text/唐詩三百首.txt').toString());
    const yuehfuuShyjyi = toLF(fs.readFileSync('./text/樂府詩集.txt').toString());

    shyjing.replace(/《(.*?)》\n((?:.|\n)*?)\n(?:\n|$)/gu, (_, title, poem) => {
        poems.push({
            title: title,
            poem: poem.replace(/\n/gu, '').replace(/[，。！？；、：]$/gu, '').split(/[，。！？；、：]/gu),
        });
    });

    tarngshySanbaeShoou.replace(/詩名:(.*?)\n作者:(.*?)\n詩體:(.*?)\n詩文:(?:\(押(.*?)韻\))?(.*?)\n/gu, (_, title, poet, type, rhyme, poem) => {
        poems.push({
            title: title,
            poet: poet,
            type: type,
            rhyme: rhyme,
            poem: poem.replace(/\n/gu, '').replace(/[，。！？；、：]$/gu, '').split(/[，。！？；、：]/gu),
        });
    });

    yuehfuuShyjyi.replace(/---\n.*?\n詩題：(.*?)\n篇目：(.*?)\n朝代：(.*?)\n作者：(.*?)\n卷別：(.*?)\n(?:詩題解：(.*?)\n)?(?:詩序：(.*?)\n)?詩文：(.*?)\n/gu, (_, title, chapter, dynasty, poet, fold, explain, prelude, poem) => {
        poems.push({
            title: title,
            chapter: chapter,
            dynasty: dynasty,
            poet: poet,
            fold: fold,
            explain: explain,
            prelude: prelude,
            poem: poem.replace(/\n/gu, '').replace(/【.*?】/gu, '').replace(/[，。！？；、：]$/gu, '').split(/[，。！？；、：]/gu),
        });
    });

    const getPairs = (poem) => {
        let output = [];
        let offset = 0;
        let pairNum = Math.floor(poem.poem.length / 2);
        while (offset < pairNum) {
            let upper = [...poem.poem[offset * 2]];
            let lower = [...poem.poem[offset * 2 + 1]];
            if (upper.length === lower.length) {
                upper.forEach((value, index) => {
                    output.push([value, lower[index]]);
                });
            };
            offset += 1;
        };
        return output;
    };

    for (let poem of poems) {
        allPairs.push(...getPairs(poem));
    };
} catch (ex) {
    conLog('Failed to load poem-data', true);
};
try {
    pPoem = require('./data/poem.private.js');
} catch (ex) {
    conLog('Failed to load poem.private.js', true);
};
try {
    gPoem = require('./data/poem.group.js');
} catch (ex) {
    conLog('Failed to load poem.group.js', true);
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

const reply = async (rawdata, message, options) => {
    if (Object.prototype.toString.call(message) === '[object String]') {
        let length;
        let id;

        if (options && options.noEscape) {
            length = [...message.replace(/\[CQ:(.*?),(.*?)\]/gu, ' ').replace(/&#91;/gu, '[').replace(/&#93;/gu, ']').replace(/&amp;/gu, '&')].length;
        } else {
            length = [...message].length;
            message = qqbot.escape(message);
        };

        // 延时
        if (config.sleep === undefined ? true : config.sleep) {
            await sleep((config.sleep || 100) * length);
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

/* const daapen = () => {
    // 若 penshernCopy 为空，将 penshern 内容放入 penshernCopy
    if (penshernCopy.length === 0) {
        penshernCopy.push(...penshern);
    };
    let random = arrayRandom(penshernCopy, config.unique);
    // 返回回答
    return random;
}; */

/* const daapenActive = async () => {
    let offset = 0;
    while (offset < (config.count || 100)) {
        let random = daapen();
        if (config.sleep === undefined ? true : config.sleep) {
            await sleep((config.sleep || 100) * [...random].length);
        };
        if (config.isGroup === undefined ? true : config.isGroup) {
            qqbot.sendGroupMessage(config.to, config.at ? `[CQ:at,qq=${config.at}] ${random}` : random, { noEscape: true });
        } else {
            qqbot.sendPrivateMessage(config.to, random, { noEscape: true });
        };
        conLog(`Output: ${random}`);
        offset += 1;
    };
}; */

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

const AIxxz = (rawdata, question, lang = 'zh-CN', city = '', callback) => {
    let uuid = AIxxzUUID[rawdata.from];
    if (!uuid) {
        uuid = uuidv4();
        AIxxzUUID[rawdata.from] = uuid;
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
    };

    if (rawdata.extra.images.length === 0) {
        let postData = `secret=${encodeURIComponent(config.appid || 'dcXbXX0X')}|${encodeURIComponent(config.ak || '5c011b2726e0adb52f98d6a57672774314c540a0')}|${encodeURIComponent(config.token || 'f9e79b0d9144b9b47f3072359c0dfa75926a5013')}&event=GetUk&data=["${encodeURIComponent(uuid)}"]`;
        let reqUK = http.request(new URL('http://get.xiaoxinzi.com/app_event.php'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) } }, (res) => {
            // 用数组装入 chunk
            let chunks = [];
            // 接收 chunk
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            // 接收完毕
            res.on('end', () => {
                // 将 chunk 合并起来，读为 JSON
                let chunk = JSON.parse(Buffer.concat(chunks).toString());
                // 请求回答
                let postData = `app=${encodeURIComponent(config.appid || 'dcXbXX0X')}&dev=${encodeURIComponent(uuid)}&uk=${encodeURIComponent(chunk.data[uuid].uk)}&text=${encodeURIComponent(question)}&lang=${encodeURIComponent(lang)}&nickname=${encodeURIComponent(config.nickname || rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString())}&city=${encodeURIComponent(city)}`;
                let reqAnswer = http.request(new URL('http://ai.xiaoxinzi.com/api3.php'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData) } }, (res) => {
                    let chunks = [];
                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on('end', async () => {
                        let chunk = Buffer.concat(chunks).toString();
                        // 特别注意，请求回答的时候 JSON 前面就可能有各种奇妙的报错了，所以要先滤掉
                        chunk = chunk.substring(chunk.search(/\{/gu));
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
                        // 图片这个比较特殊，会给出重复链接，所以筛掉
                        } else if (chunk.xxztype === 'image') {
                            if (chunk.datatype === 'text') {
                                answer.push(chunk.data);
                            } else {
                                for (let data of chunk.data) {
                                    let list = [];
                                    for (let data2 in data) {
                                        if (data2 !== 'picurl') {
                                            list.push(data2);
                                        };
                                    };
                                    list.sort(sort);
                                    for (let data2 of list) {
                                        answer.push(data[data2]);
                                    };
                                };
                            };
                        } else if (chunk.data && chunk.data.text1) {
                            answer.push(chunk.data.text1);
                        } else if (Array.isArray(chunk.data)) {
                            for (let data of chunk.data) {
                                // 有时数组里面还包着对象
                                let list = [];
                                for (let data2 in data) {
                                    if (!data2.match(/BBSCOLN/g)) {
                                        list.push(data2);
                                    };
                                };
                                list.sort(sort);
                                for (let data2 of list) {
                                    answer.push(data[data2]);
                                };
                            };
                        } else if (Object.prototype.toString.call(chunk.data) === '[object Object]') {
                            let list = [];
                            for (let data in chunk.data) {
                                if (!data.match(/BBSCOLN/g)) {
                                    list.push(data);
                                };
                            };
                            list.sort(sort);
                            for (let data of list) {
                                answer.push(chunk.data[data]);
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
                        // 处理 URI
                        let answerURI = [];
                        for (let data of answer) {
                            if (data.search(/https?:\/\//gu) > -1) {
                                // 百分号编码
                                data = encodeURI(data);
                                answerURI.push(data);
                            } else {
                                answerURI.push(data);
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
                            let remindMessage = chunk.semantic.message || '';
                            if (lang === 'zh_TW' || lang === 'zh_HK') {
                                remindMessage = `提醒時間到了！${remindMessage}`;
                            } else {
                                remindMessage = `提醒时间到了！${remindMessage}`;
                            };
                            if (!(chunk.semantic.message === '提醒時間最短為1分鐘！' || chunk.semantic.message === '提醒时间最短为1分钟！')) {
                                // 获取当前时间，并与小信子返回的时间相减，然后延时
                                let delay = remindTime - new Date();
                                await sleep(delay);
                            };
                        };
                    });
                });
                reqAnswer.write(postData);
                reqAnswer.end();
            });
        });
        reqUK.write(postData);
        reqUK.end();
    } else if (rawdata.extra.images.join(',').search(/\.gif/gu) > -1) {
        let answer;
        if (lang === 'zh_TW' || lang === 'zh_HK') {
            answer = '那就不曉得了。';
        } else {
            answer = '那就不晓得了。';
        };
        callback(answer);
    } else {
        let answer = '收到图片';
        callback(answer);
    };
};

const pet = (user, input, randomDie = undefined) => {
    let pet = petList[user] || {};
    let output;

    if (input.search(/^[领領][养養]/gu) > -1 && input.replace(/^[领領][养養] ?/gu, '').length > 0) {
        if (pet.dead) {
            output = eval(`\`${arrayRandom(petText.readoptDead)}\``);
        } else if (pet.name) {
            output = eval(`\`${arrayRandom(petText.readopt)}\``);
        } else {
            pet.name = input.replace(/^[领領][养養] ?/gu, '');
            pet.dead = false;
            output = eval(`\`${arrayRandom(petText.adopt)}\``);
        };
    } else if (input.search(/^[喂餵投]食/gu) > -1) {
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
    } else if (input.search(/^([宠寵]物|[状狀][态態])/gu) > -1) {
        if (pet.dead) {
            output = eval(`\`${arrayRandom(petText.dead)}\``);
        } else if (pet.name) {
            output = eval(`\`${arrayRandom(petText.feed)}\``);
        } else {
            output = eval(`\`${arrayRandom(petText.adoptRemind)}\``);
        };
    // 如果发红包且宠物死了，复活宠物
    } else if (input.search(/\[CQ:hb,.*?\]/gu) > -1 && pet.dead) {
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
        output = new OpenCC('./lib/OpenCC/t2s.json').convertSync(output);
    };
    return output;
};

const alphaKufonZero = () => eval(`\`${arrayRandom(kufonFormat)}\``);

const googleTranslate = (text, src = 'auto', tgt = 'en', callback) => {
    // 根据 tkk 获取 tk，高能
    const getTk = (text, tkk) => {
        // 我只好用 Nazo 表达我的绝望
        const nazo = (a, b) => {
            for (let c = 0; c < b.length - 2; c += 3) {
                let d = b[c + 2];
                // 啊啊啊 charCodeAt 必须死，，，
                // 但原文如此，我也没办法
                d = d >= 'a' ? d.charCodeAt(0) - 87 : parseInt(d);
                d = b[c + 1] === '+' ? a >>> d : a << d;
                a = b[c] === '+' ? a + d & 4294967295 : a ^ d;
            };
            return a;
        };
        let tkkInt = parseInt(tkk.split('.')[0]);
        let tkkDec = parseInt(tkk.split('.')[1]);
        let a = [];
        let b = 0;
        for (let c = 0; c < text.length; c++) {
            let d = text.charCodeAt(c);
            // 这段代码原文是用 ? : 写的，阅读起来完全就是地狱
            if (d < 128) {
                a[b++] = d;
            } else {
                if (d < 2048) {
                    a[b++] = d >> 6 | 192;
                } else {
                    if ((d & 64512) === 55296 && c + 1 < text.length && (text.charCodeAt(c + 1) & 64512) === 56320) {
                        d = 65536 + ((d & 1023) << 10) + (text.charCodeAt(++c) & 1023);
                        a[b++] = d >> 18 | 240;
                        a[b++] = d >> 12 & 63 | 128;
                    } else {
                        a[b++] = d >> 12 | 224;
                    };
                    a[b++] = d >> 6 & 63 | 128;
                };
                a[b++] = d & 63 | 128;
            };
        };
        let e = tkkInt;
        for (b = 0; b < a.length; b++) {
            e += a[b];
            e = nazo(e, '+-a^+6');
        };
        e = nazo(e, '+-3^+b+-f');
        e ^= tkkDec;
        if (e < 0) {
            e = (e & 2147483647) + 2147483648;
        };
        e %= 1E6;
        return `${e}.${e ^ tkkInt}`;
    };
    // 开始请求
    https.get(new URL('https://translate.google.cn/'), (res) => {
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            let chunk = Buffer.concat(chunks).toString();
            let tkk = chunk.match(/tkk:'(.*?)'/u)[1];
            let tk = getTk(text, tkk);
            https.get(new URL(`https://translate.google.cn/translate_a/single?client=webapp&sl=${encodeURIComponent(src)}&tl=${encodeURIComponent(tgt)}&hl=${encodeURIComponent(tgt)}&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&tk=${encodeURIComponent(tk)}&q=${encodeURIComponent(text)}`), (res) => {
                let chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    let chunk = Buffer.concat(chunks).toString();
                    // 读入 JSON
                    try {
                        chunk = JSON.parse(chunk);
                    } catch (ex) {
                        conLog(ex, true);
                    };
                    let output = '';
                    for (let result of chunk[0]) {
                        if (result[0] !== null) {
                            output += result[0];
                        };
                    };
                    callback(output);
                });
            });
        });
    });
};

const baiduFanyi = (text, src = 'auto', tgt = 'en', callback) => {
    // 百度翻译的 sign 算法源于 Google 翻译，但更为キチガイ
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
    https.get(new URL('https://fanyi.baidu.com/'), (res) => {
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            // 百度翻译最坑的一点在于要带 Cookie 请求，得到的 Token 才有效，所以要先拿到 Cookie 再重新请求
            let cookie = res.headers['set-cookie'];
            https.get(new URL('https://fanyi.baidu.com/'), { headers: { 'Cookie': cookie } }, (res) => {
                let chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    let chunk = Buffer.concat(chunks).toString();
                    let token = chunk.match(/token: '(.*?)'/u)[1];
                    // gtk 类似于 Google 翻译的 tkk
                    let gtk = chunk.match(/gtk = '(.*?)'/u)[1];
                    // sign 类似于 Google 翻译的 tk
                    let sign = getSign(text, gtk);
                    let postData = `from=${encodeURIComponent(src)}&to=${encodeURIComponent(tgt)}&query=${encodeURIComponent(text)}&transtype=realtime&simple_means_flag=3&sign=${encodeURIComponent(sign)}&token=${encodeURIComponent(token)}`;
                    let req = https.request(new URL('https://fanyi.baidu.com/v2transapi'), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(postData), 'Cookie': cookie } }, (res) => {
                        let chunks = [];
                        res.on('data', (chunk) => {
                            chunks.push(chunk);
                        });
                        res.on('end', () => {
                            let chunk = Buffer.concat(chunks).toString();
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
                            callback(output);
                        });
                    });
                    req.write(postData);
                    req.end();
                });
            });
        });
    });
};

const couplet = (text, callback) => {
    https.get(new URL(`https://ai-backend.binwang.me/chat/couplet/${encodeURIComponent(text)}`), (res) => {
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            let chunk = Buffer.concat(chunks).toString();
            // 读入 JSON
            try {
                chunk = JSON.parse(chunk);
            } catch (ex) {
                conLog(ex, true);
            };
            callback(chunk.output);
        });
    });
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

// 移植自 https://github.com/Lo-Aidas/MathematicaToys/blob/master/verseGen.nb
// 另外有所改进
const verseGen = (begin, length, r = 30, twogram = false) => {
    // 首先是函数准备阶段
    const getUpperPair = (ch) => {
        let output = [];
        for (let pair of allPairs) {
            if (pair[1] === ch) {
                output.push(pair[0]);
            };
        };
        return output;
    };

    const getLowerPair = (ch) => {
        let output = [];
        for (let pair of allPairs) {
            if (pair[0] === ch) {
                output.push(pair[1]);
            };
        };
        return output;
    };

    const getNext = (ch) => {
        let output = [];
        let list = [];
        for (let poem of poems) {
            list.push(...poem.poem);
        };
        for (let poem of list) {
            poem.replace(new RegExp(`${ch}(.)`, 'gu'), (_, next) => {
                output.push(next);
            });
        };
        return output;
    };

    const randomSelect = (list, times) => {
        // 匹配失败的输出 U+D800（不用正规字符，防止被错误匹配），以待处理
        let output = '\u{D800}';
        let weight = new Map();
        for (let value of list) {
            if (weight.has(value)) {
                weight.set(value, weight.get(value) + 1);
            } else {
                weight.set(value, 1);
            };
        };
        let weightSqr = new Map();
        for (let [key, value] of weight) {
            weightSqr.set(key, Math.pow(value, 2));
        };
        let max = 0;
        let weightRange = new Map();
        for (let [key, value] of weightSqr) {
            let min = max;
            max += value;
            weightRange.set(key, [min, max]);
        };
        let random = [];
        let offset = 0;
        while (offset < times) {
            let num = Math.random() * max;
            for (let [key, value] of weightRange) {
                if (value[0] <= num && num < value[1]) {
                    random.push(key);
                    break;
                };
            };
            offset += 1;
        };
        let sel = new Map();
        for (let value of random) {
            if (sel.has(value)) {
                sel.set(value, sel.get(value) + 1);
            } else {
                sel.set(value, 1);
            };
        };
        max = 0;
        for (let [key, value] of sel) {
            if (value > max) {
                max = value;
                output = key;
            };
        };
        return output;
    };

    const nextPairedSelect = (list1, list2, times) => {
        let output = '\u{D800}';
        let weight1 = new Map();
        let weight2 = new Map();
        for (let value of list1) {
            if (weight1.has(value)) {
                weight1.set(value, weight1.get(value) + 1);
            } else {
                weight1.set(value, 1);
            };
        };
        for (let value of list2) {
            if (weight2.has(value)) {
                weight2.set(value, weight2.get(value) + 1);
            } else {
                weight2.set(value, 1);
            };
        };
        let keys = [...new Set([...weight1.keys(), ...weight2.keys()])];
        let weight = new Map();
        for (let key of keys) {
            if (weight1.has(key) && weight2.has(key)) {
                weight.set(key, weight1.get(key) * weight2.get(key));
            } else {
                weight.set(key, 0);
            };
        };
        let max = 0;
        let weightRange = new Map();
        for (let [key, value] of weight) {
            let min = max;
            max += value;
            weightRange.set(key, [min, max]);
        };
        let random = [];
        let offset = 0;
        while (offset < times) {
            let num = Math.random() * max;
            for (let [key, value] of weightRange) {
                if (value[0] <= num && num < value[1]) {
                    random.push(key);
                    break;
                };
            };
            offset += 1;
        };
        let sel = new Map();
        for (let value of random) {
            if (sel.has(value)) {
                sel.set(value, sel.get(value) + 1);
            } else {
                sel.set(value, 1);
            };
        };
        max = 0;
        for (let [key, value] of sel) {
            if (value > max) {
                max = value;
                output = key;
            };
        };
        return output;
    };
    // 核心部分
    let input = new OpenCC('./lib/OpenCC/s2t.json').convertSync(begin);
    let resp = randomSelect(getLowerPair([...input][0]), r);
    let offset = 1;
    while (offset < [...input].length) {
        resp += nextPairedSelect(getLowerPair([...input][offset]), getNext([...resp].slice(twogram && [...resp].length >= 2 ? -2 : -1).join('')), r);
        offset += 1;
    };
    let ask = input;
    while ([...ask].length < length) {
        let asking = [...ask].slice(twogram && [...ask].length >= 2 ? -2 : -1).join('');
        let askingset = getNext(asking);
        if ([...ask].length >= 2) {
            let del = [...ask].slice(-2)[0];
            while (askingset.includes(del)) {
                askingset.splice(askingset.indexOf(del), 1);
            };
        };
        asking = randomSelect(askingset, r);
        let pairingset = getLowerPair(asking);
        let responding = [...resp].slice(twogram && [...resp].length >= 2 ? -2 : -1).join('');
        let respondingset = getNext(responding);
        if ([...resp].length >= 2) {
            let del = [...resp].slice(-2)[0];
            while (pairingset.includes(del)) {
                pairingset.splice(pairingset.indexOf(del), 1);
            };
            while (respondingset.includes(del)) {
                respondingset.splice(respondingset.indexOf(del), 1);
            };
        };
        responding = nextPairedSelect(pairingset, respondingset, r);

        ask += asking;
        resp += responding;
    };
    // 替换为「█」
    ask = ask.replace(/\u{D800}/gu, '█');
    resp = resp.replace(/\u{D800}/gu, '█');
    if (config.simply) {
        ask = new OpenCC('./lib/OpenCC/t2s.json').convertSync(ask);
        resp = new OpenCC('./lib/OpenCC/t2s.json').convertSync(resp);
    };
    let showing = `${ask},${resp}`;
    return [ask, resp];
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

// https://github.com/Meeken1998/wtfurry
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

/* if (config.mode === 'active') {
    // 主动打喷
    daapenActive();
} else { */
let modeList = '可切换模式列表：chishoh、AIxxz、pet、gong、kufon、gt、gtRound、couplet、code、bf、bfRound、poem、jiowjeh、wtfurry';
// 群聊
qqbot.on('GroupMessage', (rawdata) => {
    if (config.pModeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').search(new RegExp(config.pModeSwitch, 'gu')) > -1) {
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
    } else if (config.gModeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').search(new RegExp(config.gModeSwitch, 'gu')) > -1) {
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
    } else if (config.modeSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').search(new RegExp(config.modeSwitch, 'gu')) > -1) {
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
    } else if (config.forceWriteSwitch && rawdata.extra.ats.includes(botQQ) && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '').search(new RegExp(config.forceWriteSwitch, 'gu')) > -1) {
        writeConfig(config, './config.js');
        writeConfig(pMode, './data/mode.private.js');
        writeConfig(gMode, './data/mode.group.js');
        writeConfig(petList, './data/pet.list.js');
        writeConfig(pGt, './data/gt.private.js');
        writeConfig(gGt, './data/gt.group.js');
        writeConfig(pAIxxz, './data/AIxxz.private.js');
        writeConfig(gAIxxz, './data/AIxxz.group.js');
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
        writeConfig(pPoem, './data/poem.private.js');
        writeConfig(gPoem, './data/poem.group.js');
        reply(rawdata, '所有数据已强制写入。');
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
            // 被动打喷
            /* case 'passive':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let random = daapen();
                    reply(rawdata, random, { noEscape: true });
                };
                break; */

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
                    if (config.pLangSwitch && question.search(new RegExp(config.pLangSwitch, 'gu')) > -1) {
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
                    } else if (config.pCitySwitch && question.search(new RegExp(config.pCitySwitch, 'gu')) > -1) {
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
                    } else if (config.gLangSwitch && question.search(new RegExp(config.gLangSwitch, 'gu')) > -1) {
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
                    } else if (config.gCitySwitch && question.search(new RegExp(config.gCitySwitch, 'gu')) > -1) {
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
                    } else if (config.langSwitch && question.search(new RegExp(config.langSwitch, 'gu')) > -1) {
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
                    } else if (config.citySwitch && question.search(new RegExp(config.citySwitch, 'gu')) > -1) {
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
                            reply(rawdata, answer);
                        });
                    };
                };
                break;

            // 某致郁游戏，复活一时爽，一直复活一直爽
            case 'pet':
                if (rawdata.extra.ats.includes(botQQ) || rawdata.raw.search(/\[CQ:hb,.*?\]/gu) > -1) {
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
                    if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                        googleTranslate(input, src, tgt, (output) => {
                            reply(rawdata, output);
                        });
                    };
                };
                break;

            // Google 来回翻译，翻译过去再翻译回来
            // 一个来回就面目全非了 www
            case 'gtRound':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                        googleTranslate(input, src, tgt, (output) => {
                            googleTranslate(output, tgt, src, (output) => {
                                reply(rawdata, output);
                            });
                        });
                    };
                };
                break;

            // 对对联
            // 就是那个 https://ai.binwang.me/couplet/，好像很火的样子
            case 'couplet':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '')).text;
                    couplet(input, (output) => {
                        reply(rawdata, output);
                    });
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
                    if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                        baiduFanyi(input, src, tgt, (output) => {
                            reply(rawdata, output);
                        });
                    };
                };
                break;

            // 百度来回翻译
            case 'bfRound':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './data/gt.private.js');
                    } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                        gGt[rawdata.group] = gGt[rawdata.group] || {};
                        let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                        let newTgt = gGt[rawdata.group].src || config.gtSrc;
                        gGt[rawdata.group].src = newSrc;
                        gGt[rawdata.group].tgt = newTgt;
                        reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                        writeConfig(gGt, './data/gt.group.js');
                    } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                    } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                    } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                        baiduFanyi(input, src, tgt, (output) => {
                            baiduFanyi(output, tgt, src, (output) => {
                                reply(rawdata, output);
                            });
                        });
                    };
                };
                break;

            // 作诗
            case 'poem':
                if (rawdata.extra.ats.includes(botQQ)) {
                    let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${botQQ}\\] ?`, 'gu'), '');
                    if (config.pLengthSwitch && input.search(new RegExp(config.pLengthSwitch, 'gu')) > -1) {
                        pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                        let length = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.pLengthSwitch, 'gu'), '')).text);
                        if (length) {
                            pPoem[rawdata.from].length = length;
                            reply(rawdata, `已更改单 QQ 长度至「${length}」。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        } else {
                            pPoem[rawdata.from].length = undefined;
                            reply(rawdata, `已清除单 QQ 长度。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        };
                    } else if (config.pRandomitySwitch && input.search(new RegExp(config.pRandomitySwitch, 'gu')) > -1) {
                        pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                        let randomity = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.pRandomitySwitch, 'gu'), '')).text);
                        if (randomity) {
                            pPoem[rawdata.from].randomity = randomity;
                            reply(rawdata, `已更改单 QQ 随机度至「${randomity}」。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        } else {
                            pPoem[rawdata.from].randomity = undefined;
                            reply(rawdata, `已清除单 QQ 随机度。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        };
                    } else if (config.pTwogramSwitch && input.search(new RegExp(config.pTwogramSwitch, 'gu')) > -1) {
                        pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                        let twogram = qqbot.parseMessage(input.replace(new RegExp(config.pTwogramSwitch, 'gu'), '')).text.toLowerCase();
                        if (twogram === 'true' || twogram === '1' || twogram === 'false' || twogram === '0') {
                            pPoem[rawdata.from].twogram = Boolean(JSON.parse(twogram));
                            reply(rawdata, `已更改单 QQ 2gram 至「${Boolean(JSON.parse(twogram))}」。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        } else {
                            pPoem[rawdata.from].twogram = undefined;
                            reply(rawdata, `已清除单 QQ 2gram。`);
                            writeConfig(pPoem, './data/poem.private.js');
                        };
                    } else if (config.gLengthSwitch && input.search(new RegExp(config.gLengthSwitch, 'gu')) > -1) {
                        gPoem[rawdata.group] = gPoem[rawdata.group] || {};
                        let length = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.gLengthSwitch, 'gu'), '')).text);
                        if (length) {
                            gPoem[rawdata.group].length = length;
                            reply(rawdata, `已更改单群长度至「${length}」。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        } else {
                            gPoem[rawdata.group].length = undefined;
                            reply(rawdata, `已清除单群长度。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        };
                    } else if (config.gRandomitySwitch && input.search(new RegExp(config.gRandomitySwitch, 'gu')) > -1) {
                        gPoem[rawdata.group] = gPoem[rawdata.group] || {};
                        let randomity = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.gRandomitySwitch, 'gu'), '')).text);
                        if (randomity) {
                            gPoem[rawdata.group].randomity = randomity;
                            reply(rawdata, `已更改单群随机度至「${randomity}」。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        } else {
                            gPoem[rawdata.group].randomity = undefined;
                            reply(rawdata, `已清除单群随机度。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        };
                    } else if (config.gTwogramSwitch && input.search(new RegExp(config.gTwogramSwitch, 'gu')) > -1) {
                        gPoem[rawdata.group] = gPoem[rawdata.group] || {};
                        let twogram = qqbot.parseMessage(input.replace(new RegExp(config.gTwogramSwitch, 'gu'), '')).text.toLowerCase();
                        if (twogram === 'true' || twogram === '1' || twogram === 'false' || twogram === '0') {
                            gPoem[rawdata.group].twogram = Boolean(JSON.parse(twogram));
                            reply(rawdata, `已更改单群 2gram 至「${Boolean(JSON.parse(twogram))}」。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        } else {
                            gPoem[rawdata.group].twogram = undefined;
                            reply(rawdata, `已清除单群 2gram。`);
                            writeConfig(gPoem, './data/poem.group.js');
                        };
                    } else if (config.lengthSwitch && input.search(new RegExp(config.lengthSwitch, 'gu')) > -1) {
                        let length = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.lengthSwitch, 'gu'), '')).text);
                        if (length) {
                            config.length = length;
                            reply(rawdata, `已更改全局长度至「${length}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pPoem[rawdata.from] && pPoem[rawdata.from].length) {
                                current.push(`单 QQ 长度为「${pPoem[rawdata.from].length}」`);
                            };
                            if (gPoem[rawdata.group] && gPoem[rawdata.group].length) {
                                current.push(`单群长度为「${gPoem[rawdata.group].length}」`);
                            };
                            current.push(`全局长度为「${config.length}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.randomitySwitch && input.search(new RegExp(config.randomitySwitch, 'gu')) > -1) {
                        let randomity = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.randomitySwitch, 'gu'), '')).text);
                        if (randomity) {
                            config.randomity = randomity;
                            reply(rawdata, `已更改全局随机度至「${randomity}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pPoem[rawdata.from] && pPoem[rawdata.from].randomity) {
                                current.push(`单 QQ 随机度为「${pPoem[rawdata.from].randomity}」`);
                            };
                            if (gPoem[rawdata.group] && gPoem[rawdata.group].randomity) {
                                current.push(`单群随机度为「${gPoem[rawdata.group].randomity}」`);
                            };
                            current.push(`全局随机度为「${config.randomity}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else if (config.twogramSwitch && input.search(new RegExp(config.twogramSwitch, 'gu')) > -1) {
                        let twogram = qqbot.parseMessage(input.replace(new RegExp(config.twogramSwitch, 'gu'), '')).text.toLowerCase();
                        if (twogram === 'true' || twogram === '1' || twogram === 'false' || twogram === '0') {
                            config.twogram = Boolean(JSON.parse(twogram));
                            reply(rawdata, `已更改全局 2gram 至「${Boolean(JSON.parse(twogram))}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            let current = [];
                            if (pPoem[rawdata.from] && pPoem[rawdata.from].twogram !== undefined) {
                                current.push(`单 QQ 2gram 为「${pPoem[rawdata.from].twogram}」`);
                            };
                            if (gPoem[rawdata.group] && gPoem[rawdata.group].twogram !== undefined) {
                                current.push(`单群 2gram 为「${gPoem[rawdata.group].twogram}」`);
                            };
                            current.push(`全局 2gram 为「${config.twogram}」`);
                            current = `当前${current.join('，')}。`;
                            reply(rawdata, current);
                        };
                    } else {
                        let length;
                        let randomity;
                        let twogram;
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].length) {
                            length = pPoem[rawdata.from].length;
                        } else if (gPoem[rawdata.group] && gPoem[rawdata.group].length) {
                            length = gPoem[rawdata.group].length;
                        } else {
                            length = config.length || 7;
                        };
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].randomity) {
                            randomity = pPoem[rawdata.from].randomity;
                        } else if (gPoem[rawdata.group] && gPoem[rawdata.group].randomity) {
                            randomity = gPoem[rawdata.group].randomity;
                        } else {
                            randomity = config.randomity;
                        };
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].twogram !== undefined) {
                            twogram = pPoem[rawdata.from].twogram;
                        } else if (gPoem[rawdata.group] && gPoem[rawdata.group].twogram !== undefined) {
                            twogram = gPoem[rawdata.group].twogram;
                        } else {
                            twogram = config.twogram;
                        };
                        input = qqbot.parseMessage(input).text;
                        let output = verseGen(input, length, randomity, twogram);
                        output = `${output[0]}，${output[1]}。`;
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
    if (config.pModeSwitch && rawdata.raw.search(new RegExp(config.pModeSwitch, 'gu')) > -1) {
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
    } else if (config.modeSwitch && rawdata.raw.search(new RegExp(config.modeSwitch, 'gu')) > -1) {
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
    } else if (config.forceWriteSwitch && rawdata.raw.search(new RegExp(config.forceWriteSwitch, 'gu')) > -1) {
        writeConfig(config, './config.js');
        writeConfig(pMode, './data/mode.private.js');
        writeConfig(gMode, './data/mode.group.js');
        writeConfig(petList, './data/pet.list.js');
        writeConfig(pGt, './data/gt.private.js');
        writeConfig(gGt, './data/gt.group.js');
        writeConfig(pAIxxz, './data/AIxxz.private.js');
        writeConfig(gAIxxz, './data/AIxxz.group.js');
        writeConfig(AIxxzUUID, './data/AIxxz.uuid.js');
        writeConfig(pPoem, './data/poem.private.js');
        writeConfig(gPoem, './data/poem.group.js');
        reply(rawdata, '所有数据已强制写入。');
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
        switch (mode) {
            /* case 'passive':
                let random = daapen();
                reply(rawdata, random, { noEscape: true });
                break; */

            case 'chishoh':
                question = rawdata.raw;
                let answer = jinkohChishoh(question);
                reply(rawdata, answer, { noEscape: true });
                break;

            case 'AIxxz':
                question = rawdata.raw;
                if (config.pLangSwitch && question.search(new RegExp(config.pLangSwitch, 'gu')) > -1) {
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
                } else if (config.pCitySwitch && question.search(new RegExp(config.pCitySwitch, 'gu')) > -1) {
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
                } else if (config.langSwitch && question.search(new RegExp(config.langSwitch, 'gu')) > -1) {
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
                } else if (config.citySwitch && question.search(new RegExp(config.citySwitch, 'gu')) > -1) {
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
                        reply(rawdata, answer);
                    });
                };
                break;

            case 'pet':
                input = rawdata.raw;
                let output = pet(rawdata.from, input);
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
                if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                    googleTranslate(input, src, tgt, (output) => {
                        reply(rawdata, output);
                    });
                };
                break;

            case 'gtRound':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                    googleTranslate(input, src, tgt, (output) => {
                        googleTranslate(output, tgt, src, (output) => {
                            reply(rawdata, output);
                        });
                    });
                };
                break;

            case 'couplet':
                input = rawdata.text;
                couplet(input, (output) => {
                    reply(rawdata, output);
                });
                break;

            case 'code':
                str = rawdata.text;
                let code = charCode(str);
                reply(rawdata, code);
                break;

            case 'bf':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                    baiduFanyi(input, src, tgt, (output) => {
                        reply(rawdata, output);
                    });
                };
                break;

            case 'bfRound':
                input = rawdata.raw;
                if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                    pGt[rawdata.from] = pGt[rawdata.from] || {};
                    let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                    let newTgt = pGt[rawdata.from].src || config.gtSrc;
                    pGt[rawdata.from].src = newSrc;
                    pGt[rawdata.from].tgt = newTgt;
                    reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                    writeConfig(pGt, './data/gt.private.js');
                } else if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
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
                } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
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
                } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
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
                    baiduFanyi(input, src, tgt, (output) => {
                        baiduFanyi(output, tgt, src, (output) => {
                            reply(rawdata, output);
                        });
                    });
                };
                break;

            case 'poem':
                input = rawdata.raw;
                if (config.pLengthSwitch && input.search(new RegExp(config.pLengthSwitch, 'gu')) > -1) {
                    pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                    let length = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.pLengthSwitch, 'gu'), '')).text);
                    if (length) {
                        pPoem[rawdata.from].length = length;
                        reply(rawdata, `已更改单 QQ 长度至「${length}」。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    } else {
                        pPoem[rawdata.from].length = undefined;
                        reply(rawdata, `已清除单 QQ 长度。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    };
                } else if (config.pRandomitySwitch && input.search(new RegExp(config.pRandomitySwitch, 'gu')) > -1) {
                    pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                    let randomity = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.pRandomitySwitch, 'gu'), '')).text);
                    if (randomity) {
                        pPoem[rawdata.from].randomity = randomity;
                        reply(rawdata, `已更改单 QQ 随机度至「${randomity}」。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    } else {
                        pPoem[rawdata.from].randomity = undefined;
                        reply(rawdata, `已清除单 QQ 随机度。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    };
                } else if (config.pTwogramSwitch && input.search(new RegExp(config.pTwogramSwitch, 'gu')) > -1) {
                    pPoem[rawdata.from] = pPoem[rawdata.from] || {};
                    let twogram = qqbot.parseMessage(input.replace(new RegExp(config.pTwogramSwitch, 'gu'), '')).text.toLowerCase();
                    if (twogram === 'true' || twogram === '1' || twogram === 'false' || twogram === '0') {
                        pPoem[rawdata.from].twogram = Boolean(JSON.parse(twogram));
                        reply(rawdata, `已更改单 QQ 2gram 至「${Boolean(JSON.parse(twogram))}」。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    } else {
                        pPoem[rawdata.from].twogram = undefined;
                        reply(rawdata, `已清除单 QQ 2gram。`);
                        writeConfig(pPoem, './data/poem.private.js');
                    };
                } else if (config.lengthSwitch && input.search(new RegExp(config.lengthSwitch, 'gu')) > -1) {
                    let length = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.lengthSwitch, 'gu'), '')).text);
                    if (length) {
                        config.length = length;
                        reply(rawdata, `已更改全局长度至「${length}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].length) {
                            current.push(`单 QQ 长度为「${pPoem[rawdata.from].length}」`);
                        };
                        current.push(`全局长度为「${config.length}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.randomitySwitch && input.search(new RegExp(config.randomitySwitch, 'gu')) > -1) {
                    let randomity = parseInt(qqbot.parseMessage(input.replace(new RegExp(config.randomitySwitch, 'gu'), '')).text);
                    if (randomity) {
                        config.randomity = randomity;
                        reply(rawdata, `已更改全局随机度至「${randomity}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].randomity) {
                            current.push(`单 QQ 随机度为「${pPoem[rawdata.from].randomity}」`);
                        };
                        current.push(`全局随机度为「${config.randomity}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else if (config.twogramSwitch && input.search(new RegExp(config.twogramSwitch, 'gu')) > -1) {
                    let twogram = qqbot.parseMessage(input.replace(new RegExp(config.twogramSwitch, 'gu'), '')).text.toLowerCase();
                    if (twogram === 'true' || twogram === '1' || twogram === 'false' || twogram === '0') {
                        config.twogram = Boolean(JSON.parse(twogram));
                        reply(rawdata, `已更改全局 2gram 至「${Boolean(JSON.parse(twogram))}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        let current = [];
                        if (pPoem[rawdata.from] && pPoem[rawdata.from].twogram !== undefined) {
                            current.push(`单 QQ 2gram 为「${pPoem[rawdata.from].twogram}」`);
                        };
                        current.push(`全局 2gram 为「${config.twogram}」`);
                        current = `当前${current.join('，')}。`;
                        reply(rawdata, current);
                    };
                } else {
                    let length;
                    let randomity;
                    let twogram;
                    if (pPoem[rawdata.from] && pPoem[rawdata.from].length) {
                        length = pPoem[rawdata.from].length;
                    } else {
                        length = config.length || 7;
                    };
                    if (pPoem[rawdata.from] && pPoem[rawdata.from].randomity) {
                        randomity = pPoem[rawdata.from].randomity;
                    } else {
                        randomity = config.randomity;
                    };
                    if (pPoem[rawdata.from] && pPoem[rawdata.from].twogram !== undefined) {
                        twogram = pPoem[rawdata.from].twogram;
                    } else {
                        twogram = config.twogram;
                    };
                    input = qqbot.parseMessage(input).text;
                    let output = verseGen(input, length, randomity, twogram);
                    output = `${output[0]}，${output[1]}。`;
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

            default:
                reply(rawdata, '当前模式不存在，请检查设定。');
                break;
        };
    };
});
// };
