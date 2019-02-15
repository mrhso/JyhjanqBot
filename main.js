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
    let zoneStr = '';
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

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const arrayRandom = (arr) => {
    return arr[Math.floor(Math.random() * arr.length)];
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

const reply = async (rawdata, isGroup, message, options) => {
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

    if (isGroup) {
        if (rawdata.from === 80000000) {
            qqbot.sendGroupMessage(rawdata.group, message, { noEscape: true });
        } else {
            qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${message}`, { noEscape: true });
        };
        // 这里要注意，数组即使为空也为真值，这与空字符串不同
        if (qqbot.parseMessage(message).extra.ats.length > 0) {
            let conout = message;
            for (let at of qqbot.parseMessage(message).extra.ats) {
                qqbot.groupMemberInfo(rawdata.group, at);
            };
            qqbot.on('GroupMemberInfo', (info) => {
                conout = conout.replace(new RegExp(`\\[CQ:at,qq=${info.qq}\\]`, 'gu'), `@${info.groupCard || info.name || info.qq.toString()}`);
                if (conout.search(/\[CQ:at,qq=\d*\]/gu === -1) && rawdata.from === 80000000) {
                    conLog(`Output: ${qqbot.parseMessage(conout).text}`);
                } else if (conout.search(/\[CQ:at,qq=\d*\]/gu === -1)) {
                    conLog(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(conout).text}`);
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
    // 生成随机数
    let ramdomIndex = Math.floor(Math.random() * penshernCopy.length);
    // 用这个随机数来从 penshernCopy 抽取喷辞
    let random = penshernCopy[ramdomIndex];
    // 从 penshernCopy 里删除用掉的喷辞
    if (config.unique) {
        penshernCopy.splice(ramdomIndex, 1);
    };
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

    answer = answer.replace(/([啊吗嗎吧呢的]+)?([？。！~]|$)/gu, '！')
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
                        chunk = JSON.parse(chunk.substring(chunk.search(/\{/gu)));
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
    let pet = petList[user] || { 'name': '', 'dead': false };
    let output = '';

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
                pet.name = '';
                pet.dead = false;
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
            let tk = getTk(text,tkk);
            https.get(new URL(`https://translate.google.cn/translate_a/single?client=webapp&sl=${encodeURIComponent(src)}&tl={encodeURIComponent(tgt)}&hl=${encodeURIComponent(tgt)}&dt=at&dt=bd&dt=ex&dt=ld&dt=md&dt=qca&dt=rw&dt=rm&dt=ss&dt=t&ie=UTF-8&oe=UTF-8&tk=${encodeURIComponent(tk)}&q=${encodeURIComponent(text)}`), (res) => {
                let chunks = [];
                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                res.on('end', () => {
                    let chunk = Buffer.concat(chunks).toString();
                    // 读入 JSON
                    chunk = JSON.parse(chunk);
                    let ret = [];
                    for (let result of chunk [0]) {
                        if (result[0] !== null) {
                            ret.push(result[0]);
                        };
                    };
                    ret = ret.join('');
                    callback(ret);
                });
            });
        });
    });
};

if (config.mode === 'active') {
    // 主动打喷
    daapenActive();
} else {
    // 群聊
    qqbot.on('GroupMessage', (rawdata) => {
        if (config.modeSwitch && rawdata.extra.ats.indexOf(qqbot.qq) > -1 && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').search(new RegExp(config.modeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').replace(new RegExp(config.modeSwitch, 'gu'), '')).text;
            if (newMode) {
                config.mode = newMode;
                reply(rawdata, true, `已切换模式至「${newMode}」。`);
                writeConfig(config, './config.js');
            } else {
                reply(rawdata, true, `当前模式为「${config.mode}」。\n可切换模式列表：\npassive\nchishoh\nAIxxz\npet\ngong\nkufon\ngt`);
            };
        } else {
            switch (config.mode) {
                // 被动打喷
                case 'passive':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let random = daapen();
                        reply(rawdata, true, random, { noEscape: true });
                    };
                    break;

                // 人工智障（Jinkō Chishō），现代日本语与「人工池沼」同音
                // 或许也可以用国语罗马字，叫 Rengong Jyhjanq，甚至 Rengong Chyrjao
                case 'chishoh':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        let answer = jinkohChishoh(question);
                        reply(rawdata, true, answer, { noEscape: true });
                    };
                    break;

                // 小信子，真·人工池沼
                case 'AIxxz':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let question = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '')).text;
                        AIxxz(rawdata, question, (answer) => {
                            reply(rawdata, true, answer);
                        });
                    };
                    break;

                // 某致郁游戏，复活一时爽，一直复活一直爽
                case 'pet':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1 || rawdata.raw.search(/\[CQ:hb,.*?\]/gu) > -1) {
                        let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        let output = pet(rawdata.from, input);
                        if(output) {
                            reply(rawdata, true, output, { noEscape: true });
                        };
                    // 即使没有 at 机器人，也有 0.5% 概率触发随机死亡
                    } else if (Math.random() < 0.005) {
                        // 不用送输入了，反正要死
                        let output = pet(rawdata.from, '', true);
                        reply(rawdata, true, output, { noEscape: true });
                    };
                    break;

                // AlphaGong 龚诗生成器
                case 'gong':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let gong = alphaGong();
                        reply(rawdata, true, gong);
                    };
                    break;

                // AlphaKufon Zero 迫真古风生成器
                case 'kufon':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let kufon = alphaKufonZero();
                        reply(rawdata, true, kufon);
                    };
                    break;

                // Google 翻译
                case 'gt':
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        let input = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
                        if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
                            let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                            if (newSrc) {
                                config.gtSrc = newSrc;
                                reply(rawdata, true, `已切换源语文至「${newSrc}」。`);
                                writeConfig(config, './config.js');
                            } else {
                                reply(rawdata, true, `当前源语文为「${config.gtSrc}」。`);
                            };
                        } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
                            let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                            if (newTgt) {
                                config.gtTgt = newTgt;
                                reply(rawdata, true, `已切换目标语文至「${newTgt}」。`);
                                writeConfig(config, './config.js');
                            } else {
                                reply(rawdata, true, `当前目标语文为「${config.gtTgt}」。`);
                            };
                        } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
                            let newSrc = config.gtTgt;
                            let newTgt = config.gtSrc;
                            config.gtSrc = newSrc;
                            config.gtTgt = newTgt;
                            reply(rawdata, true, `已交换源语文与目标语文。\n现在源语文为「${newSrc}」，目标语文为「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            input = qqbot.parseMessage(input).text;
                            googleTranslate(input, config.gtSrc || 'auto', config.gtTgt || 'en', (output) => {
                                reply(rawdata, true, output);
                            });
                        };
                    };
                    break;

                default:
                    if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
                        reply(rawdata, true, '当前模式不存在，请检查设定。');
                    };
                    break;
            };
        };
    });
    // 私聊
    qqbot.on('PrivateMessage', (rawdata) => {
        if (config.modeSwitch && rawdata.raw.search(new RegExp(config.modeSwitch, 'gu')) > -1) {
            let newMode = qqbot.parseMessage(rawdata.raw.replace(new RegExp(config.modeSwitch, 'gu'), '')).text;
            if (newMode) {
                config.mode = newMode;
                reply(rawdata, false, `已切换模式至「${newMode}」。`);
                writeConfig(config, './config.js');
            } else {
                reply(rawdata, false, `当前模式为「${config.mode}」。\n可切换模式列表：\npassive\nchishoh\nAIxxz\npet\ngong\nkufon\ngt`);
            };
        } else {
            let question;
            let input;
            switch (config.mode) {
                case 'passive':
                    let random = daapen();
                    reply(rawdata, false, random, { noEscape: true });
                    break;

                case 'chishoh':
                    question = rawdata.raw;
                    let answer = jinkohChishoh(question);
                    reply(rawdata, false, answer, { noEscape: true });
                    break;

                case 'AIxxz':
                    question = rawdata.text;
                    AIxxz(rawdata, question, (answer) => {
                        reply(rawdata, false, answer);
                    });
                    break;

                case 'pet':
                    input = rawdata.raw;
                    let output = pet(rawdata.from, input);
                    if(output) {
                        reply(rawdata, false, output, { noEscape: true });
                    };
                    break;

                case 'gong':
                    let gong = alphaGong();
                    reply(rawdata, false, gong);
                    break;

                case 'kufon':
                    let kufon = alphaKufonZero();
                    reply(rawdata, false, kufon);
                    break;

                case 'gt':
                    input = rawdata.raw;
                    if (config.gtSrcSwitch && input.search(new RegExp(config.gtSrcSwitch, 'gu')) > -1) {
                        let newSrc = qqbot.parseMessage(input.replace(new RegExp(config.gtSrcSwitch, 'gu'), '')).text;
                        if (newSrc) {
                            config.gtSrc = newSrc;
                            reply(rawdata, false, `已切换源语文至「${newSrc}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            reply(rawdata, false, `当前源语文为「${config.gtSrc}」。`);
                        };
                    } else if (config.gtTgtSwitch && input.search(new RegExp(config.gtTgtSwitch, 'gu')) > -1) {
                        let newTgt = qqbot.parseMessage(input.replace(new RegExp(config.gtTgtSwitch, 'gu'), '')).text;
                        if (newTgt) {
                            config.gtTgt = newTgt;
                            reply(rawdata, false, `已切换目标语文至「${newTgt}」。`);
                            writeConfig(config, './config.js');
                        } else {
                            reply(rawdata, false, `当前目标语文为「${config.gtTgt}」。`);
                        };
                    } else if (config.gtSwapSwitch && input.search(new RegExp(config.gtSwapSwitch, 'gu')) > -1) {
                        let newSrc = config.gtTgt;
                        let newTgt = config.gtSrc;
                        config.gtSrc = newSrc;
                        config.gtTgt = newTgt;
                        reply(rawdata, false, `已交换源语文与目标语文。\n现在源语文为「${newSrc}」，目标语文为「${newTgt}」。`);
                        writeConfig(config, './config.js');
                    } else {
                        input = qqbot.parseMessage(input).text;
                        googleTranslate(input, config.gtSrc || 'auto', config.gtTgt || 'en', (output) => {
                            reply(rawdata, false, output);
                        });
                    };
                    break;

                default:
                    reply(rawdata, false, '当前模式不存在，请检查设定。');
                    break;
            };
        };
    });
};
