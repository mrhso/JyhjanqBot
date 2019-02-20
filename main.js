'use strict';

const QQBot = require('./lib/QQBot.js');
const URL = require('url').URL;
const http = require('http');
const https = require('https');
const path = require('path');
const fs = require('fs');

const conLog = (message, isError = false) => {
    let date = new Date();
    let zone = - date.getTimezoneOffset();
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

const config = require('./config.js');
const pMode = require('./mode.private.js');
const gMode = require('./mode.group.js');

let qqbot = new QQBot({
    CoolQPro: config.CoolQPro,
    host: config.host || '127.0.0.1',
    port: config.port || 11235,
});
conLog('Starting QQBot...');

qqbot.on('Error', (err) => {
    conLog(`QQBot Error: ${err.error.toString()} (${err.event})`, true);
});

qqbot.start();

let penshern = [];
let penshernCopy = [];
try {
    penshern = require('./text.js');
} catch (ex) {
    conLog('Failed to load text.js', true);
};

let petText = {};
let petList = {};
try {
    petText = require('./pet.text.js');
} catch (ex) {
    conLog('Failed to load pet.text.js', true);
};
try {
    petList = require('./pet.list.js');
} catch (ex) {
    conLog('Failed to load pet.list.js', true);
};

let gongText = {};
let gongFormat = [];
try {
    gongText = require('./gong.text.js');
} catch (ex) {
    conLog('Failed to load gong.text.js', true);
};
try {
    gongFormat = require('./gong.format.js');
} catch (ex) {
    conLog('Failed to load gong.format.js', true);
};

let kufonText = {};
let kufonFormat = [];
try {
    kufonText = require('./kufon.text.js');
} catch (ex) {
    conLog('Failed to load kufon.text.js', true);
};
try {
    kufonFormat = require('./kufon.format.js');
} catch (ex) {
    conLog('Failed to load kufon.format.js', true);
};

let pGt = {};
let gGt = {};
try {
    pGt = require('./gt.private.js');
} catch (ex) {
    conLog('Failed to load gt.private.js', true);
};
try {
    gGt = require('./gt.group.js');
} catch (ex) {
    conLog('Failed to load gt.group.js', true);
};

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const arrayRandom = (arr, unique) => {
    let index = Math.floor(Math.random() * arr.length);
    let random = arr[index];
    if (unique) {
        arr.splice(index, 1);
    };
    return random;
};

const toLF = (str) => {
    return str.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
};

const toCRLF = (str) => {
    return toLF(str).replace(/\n/gu, '\r\n');
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
    let length;

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
            qqbot.sendGroupMessage(rawdata.group, message, { noEscape: true });
        } else {
            qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${message}`, { noEscape: true });
        };
        // 这里要注意，数组即使为空也为真值，这与空字符串不同
        if (qqbot.parseMessage(message).extra.ats.length > 0) {
            let conout = message;
            let processed = false;
            for (let at of qqbot.parseMessage(message).extra.ats) {
                qqbot.groupMemberInfo(rawdata.group, at);
            };
            qqbot.on('GroupMemberInfo', (info) => {
                conout = conout.replace(new RegExp(`\\[CQ:at,qq=${info.qq}\\]`, 'gu'), `@${info.groupCard || info.name || info.qq.toString()}`);
                if (!processed && conout.search(/\[CQ:at,qq=\d*\]/gu === -1) && rawdata.from === 80000000) {
                    conLog(`Output: ${qqbot.parseMessage(conout).text}`);
                    processed = true;
                } else if (!processed && conout.search(/\[CQ:at,qq=\d*\]/gu === -1)) {
                    conLog(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(conout).text}`);
                    processed = true;
                };
            });
        } else if (rawdata.from === 80000000) {
            conLog(`Output: ${qqbot.parseMessage(message).text}`);
        } else {
            conLog(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(message).text}`);
        };
    } else {
        qqbot.sendPrivateMessage(rawdata.from, message, { noEscape: true });
        conLog(`Output: ${qqbot.parseMessage(message).text}`);
    };
};

const daapen = () => {
    // 若 penshernCopy 为空，将 penshern 内容放入 penshernCopy
    if (penshernCopy.length === 0) {
        penshernCopy.push(...penshern);
    };
    let random = arrayRandom(penshernCopy, config.unique);
    // 返回回答
    return random;
};

const daapenActive = async () => {
    for (let i = 1; i <= (config.count || 100); i ++) {
        let random = daapen();
        // 延时不放在 for 里不行，所以没办法把发送部分封入函数
        if (config.sleep === undefined ? true : config.sleep) {
            await sleep((config.sleep || 100) * [...random].length);
        };
        if (config.isGroup === undefined ? true : config.isGroup) {
            qqbot.sendGroupMessage(config.to, random, { noEscape: true });
        } else {
            qqbot.sendPrivateMessage(config.to, random, { noEscape: true });
        };
        conLog(`Output: ${random}`);
    };
};

const jinkohChishoh = (question) => {
    let answer = question;

    answer = answer.replace(/([^？。！])$/gu, '$1？')
                   .replace(/^/gu, '\uD800').replace(/([^\uD800？。！])[啊吗嗎吧呢的]？/gu, '$1！').replace(/\uD800/gu, '')
                   .replace(/我/gu, '\uD800').replace(/[你您]/gu, '我').replace(/\uD800/gu, '你')
                   .replace(/(.)[不没沒]\1/gu, '$1')
                   .replace(/难道/gu, '当然').replace(/難道/gu, '當然')
                   .replace(/哪里/gu, '台湾').replace(/哪[裏裡]/gu, '台灣')
                   .replace(/[谁誰]/gu, '蔡英文')
                   .replace(/竟然/gu, '\uD800').replace(/究竟|到底/gu, '就').replace(/\uD800/gu, '竟然')
                   .replace(/为什么/gu, '因为非常大颗').replace(/為什麼/gu, '因為非常大顆')
                   .replace(/什么/gu, '竞选').replace(/什麼/gu, '競選');

    return answer;
};

const AIxxz = (rawdata, question, callback) => {
    if (rawdata.extra.images.length === 0) {
        let reqUK = http.request({ host: 'get.xiaoxinzi.com', path: '/app_event.php', method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } }, (res) => {
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
                // 取得 Userkey
                let uk = chunk.data.UniqueDeviceID.uk;
                // 定义 UID 为 QQ 号
                let user = rawdata.from;
                // 昵称
                let nickname;
                if (config.nickname) {
                    nickname = config.nickname;
                } else if (rawdata.from === 80000000) {
                    nickname = rawdata.user.groupCard;
                } else {
                    nickname = rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString();
                };
                // 请求回答
                let reqAnswer = http.request({ host: 'ai.xiaoxinzi.com', path: '/api3.php', method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } }, (res) => {
                    let chunks = [];
                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                    });
                    res.on('end', async () => {
                        let chunk = Buffer.concat(chunks).toString();
                        // 特别注意，请求回答的时候 JSON 前面就可能有各种奇妙的报错了，所以要先滤掉
                        chunk = chunk.substring(chunk.search(/\{/gu));
                        // 出错的时候可以看到目录「/data/wwwroot」
                        if (chunk.search(/\/data\/wwwroot/gu) > -1) {
                            return;
                        };
                        chunk = JSON.parse(chunk);
                        // 先用数组存储回答，因为小信子的返回格式比较复杂
                        let answer = [];
                        // 音乐连链接都没返回，所以没有处理的必要
                        if (chunk.xxztype === 'music') {
                            return;
                        // 图片这个比较特殊，会给出重复链接，所以筛掉
                        } else if (chunk.xxztype === 'image') {
                            for (let data of chunk.data) {
                                for (let data2 in data) {
                                    if (data2 !== 'picurl') {
                                        answer.push(data[data2]);
                                    };
                                };
                            };
                        } else if (Array.isArray(chunk.data)) {
                            for (let data of chunk.data) {
                                // 有时数组里面还包着对象
                                for (let data2 in data) {
                                    answer.push(data[data2]);
                                };
                            };
                        } else if (Object.prototype.toString.call(chunk.data) === '[object Object]') {
                            for (let data in chunk.data) {
                                answer.push(chunk.data[data]);
                            };
                        } else if (chunk.data === null) {
                            return;
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
                            let remindMessage = chunk.semantic.message;
                            if (config.lang === 'zh_TW' || config.lang === 'zh_HK') {
                                remindMessage = `提醒時間到了！${remindMessage}`;
                            } else {
                                remindMessage = `提醒时间到了！${remindMessage}`;
                            };
                            // 获取当前时间，并与小信子返回的时间相减，然后延时
                            await sleep(remindTime - new Date());
                            // 回复
                            callback(remindMessage);
                        };
                    });
                });
                reqAnswer.write(`app=${encodeURIComponent(config.appid || 'dcXbXX0X')}&dev=${encodeURIComponent(config.devid || 'UniqueDeviceID')}&uk=${encodeURIComponent(uk)}&text=${encodeURIComponent(question)}&lang=${encodeURIComponent(config.lang || 'zh_CN')}&nickname=${encodeURIComponent(nickname)}&user=${encodeURIComponent(user)}&city=${encodeURIComponent(config.city || '')}`);
                reqAnswer.end();
            });
        });
        reqUK.write(`secret=${encodeURIComponent(config.appid || 'dcXbXX0X')}|${encodeURIComponent(config.ak || '5c011b2726e0adb52f98d6a57672774314c540a0')}|${encodeURIComponent(config.token || 'f9e79b0d9144b9b47f3072359c0dfa75926a5013')}&event=GetUk&data=["${encodeURIComponent(config.devid || 'UniqueDeviceID')}"]`);
        reqUK.end();
    } else if (rawdata.extra.images.join(',').search(/\.gif/gu) > -1) {
        let answer;
        if (config.lang === 'zh_TW' || config.lang === 'zh_HK') {
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
    };
    if (input.search(/^[喂餵投]食/gu) > -1) {
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
    } else if (randomDie === undefined ? !pet.died && Math.random() < 0.005 : !pet.died && randomDie) {
        output = eval(`\`${arrayRandom(petText.randomDie)}\``);
        pet.dead = true;
    };
    // 处理完毕后更改设定
    petList[user] = pet;
    writeConfig(petList, './pet.list.js');
    // 返回答语
    return output;
};

const alphaGong = () => {
    let output = eval(`\`${arrayRandom(gongFormat)}\``);
    return output;
};

const alphaKufonZero = () => {
    let output = eval(`\`${arrayRandom(kufonFormat)}\``);
    return output;
};

const googleTranslate = (text, src = 'auto', tgt = 'en', callback) => {
    // 根据 tkk 获取 tk，高能
    const getTk = (text, tkk) => {
        // 我只好用 Nazo 表达我的绝望
        const nazo = (a, b) => {
            for (let c = 0; c < b.length - 2; c += 3) {
                let d = b[c + 2];
                d = d >= 'a' ? d.codePointAt(0) - 87 : parseInt(d);
                d = b[c + 1] === '+' ? a >>> d: a << d;
                a = b[c] === '+' ? a + d & 4294967295 : a ^ d;
            };
            return a;
        };
        let tkkInt = parseInt(tkk.split('.')[0]);
        let tkkDec = parseInt(tkk.split('.')[1]);
        let a = [];
        let b = 0;
        for (let c = 0; c < text.length; c++) {
            // 啊啊啊 charCodeAt 必须死，，，
            // 但是这里因为 non-BMP 结果不同没办法换成 codePointAt
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
        0 > e && (e = (e & 2147483647) + 2147483648);
        e %= 1E6;
        return (`${e}.${e ^ tkkInt}`);
    };
    // 开始请求
    https.get(new URL('https://translate.google.cn'), (res) => {
        let chunks = [];
        res.on('data', (chunk) => {
            chunks.push(chunk);
        });
        res.on('end', () => {
            let chunk = Buffer.concat(chunks).toString();
            let tkk = chunk.match(/tkk:'(.*?)'/u)[1];
            let tk = getTk(text, tkk);
            https.get(new URL(`https://translate.google.cn/translate_a/single?client=webapp&sl=${encodeURIComponent(src)}&tl={encodeURIComponent(tgt)}&hl=${encodeURIComponent(tgt)}&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&tk=${encodeURIComponent(tk)}&q=${encodeURIComponent(text)}`), (res) => {
                let chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    let chunk = Buffer.concat(chunks).toString();
                    // 如果是 HTML，滤掉
                    if (chunk.search(/^<!/gu) > -1) {
                        return;
                    };
                    // 读入 JSON
                    chunk = JSON.parse(chunk);
                    let output = [];
                    for (let result of chunk [0]) {
                        if (result[0] !== null) {
                            output.push(result[0]);
                        };
                    };
                    output = output.join('');
                    callback(output);
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
            // 如果是 HTML，滤掉
            if (chunk.search(/^<!/gu) > -1) {
                return;
            };
            // 读入 JSON
            chunk = JSON.parse(chunk);
            let output = chunk.output;
            callback(output);
        });
    });
};

if (config.mode === 'active') {
    // 主动打喷
    daapenActive();
} else {
    let modeList = '可切换模式列表：passive、chishoh、AIxxz、pet、gong、kufon、gt、gtRound、couplet';
    // 群聊
    qqbot.on('GroupMessage', (rawdata) => {
        if (config.pModeSwitch && rawdata.extra.ats.indexOf(qqbot.qq) > -1 && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').search(new RegExp(config.pModeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').replace(new RegExp(config.pModeSwitch, 'gu'), '')).text;
            if (newMode) {
                pMode[rawdata.from] = newMode;
                reply(rawdata, `已切换单 QQ 模式至「${newMode}」。`);
                writeConfig(pMode, './mode.private.js');
            } else {
                pMode[rawdata.from] = undefined;
                reply(rawdata, `已清除单 QQ 模式。\n${modeList}`);
                writeConfig(pMode, './mode.private.js');
            };
        } else if (config.gModeSwitch && rawdata.extra.ats.indexOf(qqbot.qq) > -1 && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').search(new RegExp(config.gModeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').replace(new RegExp(config.gModeSwitch, 'gu'), '')).text;
            if (newMode) {
                gMode[rawdata.group] = newMode;
                reply(rawdata, `已切换单群模式至「${newMode}」。`);
                writeConfig(gMode, './mode.group.js');
            } else {
                gMode[rawdata.group] = undefined;
                reply(rawdata, `已清除单群模式。\n${modeList}`);
                writeConfig(gMode, './mode.group.js');
            };
        } else if (config.modeSwitch && rawdata.extra.ats.indexOf(qqbot.qq) > -1 && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').search(new RegExp(config.modeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').replace(new RegExp(config.modeSwitch, 'gu'), '')).text;
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
                case 'passive':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let random = daapen();
                        reply(rawdata, random, { noEscape: true });
                    };
                    break;

                // 人工智障（Jinkō Chishō），现代日本语与「人工池沼」同音
                // 或许也可以用国语罗马字，叫 Rengong Jyhjanq，甚至 Rengong Chyrjao
                case 'chishoh':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        let answer = jinkohChishoh(question);
                        reply(rawdata, answer, { noEscape: true });
                    };
                    break;

                // 小信子，真·人工池沼
                case 'AIxxz':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let question = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '')).text;
                        AIxxz(rawdata, question, (answer) => {
                            reply(rawdata, answer);
                        });
                    };
                    break;

                // 某致郁游戏，复活一时爽，一直复活一直爽
                case 'pet':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1 || rawdata.raw.search(/\[CQ:hb,.*?\]/gu) > -1) {
                        let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        let output = pet(rawdata.from, input);
                        if(output) {
                            reply(rawdata, output, { noEscape: true });
                        };
                    // 即使没有 at 机器人，也有 0.5% 概率触发随机死亡
                    } else if (Math.random() < 0.005) {
                        // 不用送输入了，反正要死
                        let output = pet(rawdata.from, '', true);
                        reply(rawdata, output, { noEscape: true });
                    };
                    break;

                // AlphaGong 龚诗生成器
                case 'gong':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let gong = alphaGong();
                        reply(rawdata, gong);
                    };
                    break;

                // AlphaKufon Zero 迫真古风生成器
                case 'kufon':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let kufon = alphaKufonZero();
                        reply(rawdata, kufon);
                    };
                    break;

                // Google 翻译
                case 'gt':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                            if (newSrc) {
                                pGt[rawdata.from].src = newSrc;
                                reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                                writeConfig(pGt, './gt.private.js');
                            } else {
                                pGt[rawdata.from].src = undefined;
                                reply(rawdata, `已清除单 QQ 源语文。`);
                                writeConfig(pGt, './gt.private.js');
                            };
                        } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                            if (newTgt) {
                                pGt[rawdata.from].tgt = newTgt;
                                reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                                writeConfig(pGt, './gt.private.js');
                            } else {
                                pGt[rawdata.from].tgt = undefined;
                                reply(rawdata, `已清除单 QQ 目标语文。`);
                                writeConfig(pGt, './gt.private.js');
                            };
                        } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                            let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                            pGt[rawdata.from].src = newSrc;
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                            writeConfig(pGt, './gt.private.js');
                        } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                            if (newSrc) {
                                gGt[rawdata.group].src = newSrc;
                                reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                                writeConfig(gGt, './gt.group.js');
                            } else {
                                gGt[rawdata.group].src = undefined;
                                reply(rawdata, `已清除单群源语文。`);
                                writeConfig(gGt, './gt.group.js');
                            };
                        } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                            if (newTgt) {
                                gGt[rawdata.group].tgt = newTgt;
                                reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                                writeConfig(gGt, './gt.group.js');
                            } else {
                                gGt[rawdata.group].tgt = undefined;
                                reply(rawdata, `已清除单群目标语文。`);
                                writeConfig(gGt, './gt.group.js');
                            };
                        } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                            let newTgt = gGt[rawdata.group].src || config.gtSrc;
                            gGt[rawdata.group].src = newSrc;
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                            writeConfig(gGt, './gt.group.js');
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
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        if (config.pGtSrcSwitch && input.search(new RegExp(config.pGtSrcSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.pGtSrcSwitch, 'gu'), '')).text;
                            if (newSrc) {
                                pGt[rawdata.from].src = newSrc;
                                reply(rawdata, `已切换单 QQ 源语文至「${newSrc}」。`);
                                writeConfig(pGt, './gt.private.js');
                            } else {
                                pGt[rawdata.from].src = undefined;
                                reply(rawdata, `已清除单 QQ 源语文。`);
                                writeConfig(pGt, './gt.private.js');
                            };
                        } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                            if (newTgt) {
                                pGt[rawdata.from].tgt = newTgt;
                                reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                                writeConfig(pGt, './gt.private.js');
                            } else {
                                pGt[rawdata.from].tgt = undefined;
                                reply(rawdata, `已清除单 QQ 目标语文。`);
                                writeConfig(pGt, './gt.private.js');
                            };
                        } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                            pGt[rawdata.from] = pGt[rawdata.from] || {};
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = pGt[rawdata.from].tgt || gGt[rawdata.group].tgt || config.gtTgt;
                            let newTgt = pGt[rawdata.from].src || gGt[rawdata.group].src || config.gtSrc;
                            pGt[rawdata.from].src = newSrc;
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                            writeConfig(pGt, './gt.private.js');
                        } else if (config.gGtSrcSwitch && input.search(new RegExp(config.gGtSrcSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gGtSrcSwitch, 'gu'), '')).text;
                            if (newSrc) {
                                gGt[rawdata.group].src = newSrc;
                                reply(rawdata, `已切换单群源语文至「${newSrc}」。`);
                                writeConfig(gGt, './gt.group.js');
                            } else {
                                gGt[rawdata.group].src = undefined;
                                reply(rawdata, `已清除单群源语文。`);
                                writeConfig(gGt, './gt.group.js');
                            };
                        } else if (config.gGtTgtSwitch && input.search(new RegExp(config.gGtTgtSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gGtTgtSwitch, 'gu'), '')).text;
                            if (newTgt) {
                                gGt[rawdata.group].tgt = newTgt;
                                reply(rawdata, `已切换单群目标语文至「${newTgt}」。`);
                                writeConfig(gGt, './gt.group.js');
                            } else {
                                gGt[rawdata.group].tgt = undefined;
                                reply(rawdata, `已清除单群目标语文。`);
                                writeConfig(gGt, './gt.group.js');
                            };
                        } else if (config.gGtSwapSwitch && input.search(new RegExp(config.gGtSwapSwitch, 'gu')) > -1) {
                            gGt[rawdata.group] = gGt[rawdata.group] || {};
                            let newSrc = gGt[rawdata.group].tgt || config.gtTgt;
                            let newTgt = gGt[rawdata.group].src || config.gtSrc;
                            gGt[rawdata.group].src = newSrc;
                            gGt[rawdata.group].tgt = newTgt;
                            reply(rawdata, `已交换单群源语文与单群目标语文。\n现在单群源语文为「${newSrc}」，单群目标语文为「${newTgt}」。`);
                            writeConfig(gGt, './gt.group.js');
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
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let input = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '')).text;
                        couplet(input, (output) => {
                            reply(rawdata, output);
                        });
                    };
                    break;

                default:
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        reply(rawdata, '当前模式不存在，请检查设定。');
                    };
                    break;
            };
        };
    });
    // 私聊
    qqbot.on('PrivateMessage', (rawdata) => {
        if (config.pModeSwitch && rawdata.raw.search(new RegExp(config.pModeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(config.pModeSwitch, 'gu'), '')).text;
            if (newMode) {
                pMode[rawdata.from] = newMode;
                reply(rawdata, `已切换单 QQ 模式至「${newMode}」。`);
                writeConfig(pMode, './mode.private.js');
            } else {
                pMode[rawdata.from] = undefined;
                reply(rawdata, `已清除单 QQ 模式。\n${modeList}`);
                writeConfig(pMode, './mode.private.js');
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
        } else {
            let mode;
            if (pMode[rawdata.from]) {
                mode = pMode[rawdata.from];
            } else {
                mode = config.mode;
            };
            let question;
            let input;
            switch (mode) {
                case 'passive':
                    let random = daapen();
                    reply(rawdata, random, { noEscape: true });
                    break;

                case 'chishoh':
                    question = rawdata.raw;
                    let answer = jinkohChishoh(question);
                    reply(rawdata, answer, { noEscape: true });
                    break;

                case 'AIxxz':
                    question = rawdata.text;
                    AIxxz(rawdata, question, (answer) => {
                        reply(rawdata, answer);
                    });
                    break;

                case 'pet':
                    input = rawdata.raw;
                    let output = pet(rawdata.from, input);
                    if(output) {
                        reply(rawdata, output, { noEscape: true });
                    };
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
                            writeConfig(pGt, './gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './gt.private.js');
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
                            writeConfig(pGt, './gt.private.js');
                        } else {
                            pGt[rawdata.from].src = undefined;
                            reply(rawdata, `已清除单 QQ 源语文。`);
                            writeConfig(pGt, './gt.private.js');
                        };
                    } else if (config.pGtTgtSwitch && input.search(new RegExp(config.pGtTgtSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.pGtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            pGt[rawdata.from].tgt = newTgt;
                            reply(rawdata, `已切换单 QQ 目标语文至「${newTgt}」。`);
                            writeConfig(pGt, './gt.private.js');
                        } else {
                            pGt[rawdata.from].tgt = undefined;
                            reply(rawdata, `已清除单 QQ 目标语文。`);
                            writeConfig(pGt, './gt.private.js');
                        };
                    } else if (config.pGtSwapSwitch && input.search(new RegExp(config.pGtSwapSwitch, 'gu')) > -1) {
                        pGt[rawdata.from] = pGt[rawdata.from] || {};
                        let newSrc = pGt[rawdata.from].tgt || config.gtTgt;
                        let newTgt = pGt[rawdata.from].src || config.gtSrc;
                        pGt[rawdata.from].src = newSrc;
                        pGt[rawdata.from].tgt = newTgt;
                        reply(rawdata, `已交换单 QQ 源语文与单 QQ 目标语文。\n现在单 QQ 源语文为「${newSrc}」，单 QQ 目标语文为「${newTgt}」。`);
                        writeConfig(pGt, './gt.private.js');
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

                default:
                    reply(rawdata, '当前模式不存在，请检查设定。');
                    break;
            };
        };
    });
};
