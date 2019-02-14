'use strict';

const QQBot = require('./lib/QQBot.js');
const http = require('http');
const fs = require('fs');
const path = require('path');

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

const AIxxz = (rawdata, question, images, callback) => {
    if (images.length === 0) {
        let reqUK = http.request({host: 'get.xiaoxinzi.com', path: '/app_event.php', method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}}, (res) => {
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
                let reqAnswer = http.request({host: 'ai.xiaoxinzi.com', path: '/api3.php', method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}}, (res) => {
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
                reqAnswer.write(`app=${config.appid || 'dcXbXX0X'}&dev=${config.devid || 'UniqueDeviceID'}&uk=${uk}&text=${question}&lang=${config.lang || 'zh_CN'}&nickname=${nickname}&user=${user}&city=${config.city || ''}`);
                reqAnswer.end();
            });
        });
        reqUK.write(`secret=${config.appid || 'dcXbXX0X'}|${config.ak || '5c011b2726e0adb52f98d6a57672774314c540a0'}|${config.token || 'f9e79b0d9144b9b47f3072359c0dfa75926a5013'}&event=GetUk&data=["${config.devid || 'UniqueDeviceID'}"]`);
        reqUK.end();
    } else if (images.join(',').search(/\.gif/gu) > -1) {
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

if (config.mode === 'active') {
    // 主动打喷
    daapenActive();
} else {
    // 群聊
    qqbot.on('GroupMessage', (rawdata) => {
        if (config.switchPrefix && rawdata.extra.ats.indexOf(qqbot.qq) > -1 && rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').search(new RegExp(`^${config.switchPrefix} ?`, 'gu')) > -1) {
            let newMode = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '').replace(new RegExp(`^${config.switchPrefix} ?`, 'gu'), '');
            config.mode = newMode;
            reply(rawdata, true, `已切换模式至「${newMode}」。`);
            writeConfig(config, './config.js');
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
                        let question = qqbot.parseMessage(rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), ''));
                        let images = rawdata.extra.images;
                        AIxxz(rawdata, question, images, (answer) => {
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
        if (config.switchPrefix && rawdata.raw.search(new RegExp(`^${config.switchPrefix} ?`, 'gu')) > -1) {
            let newMode = rawdata.raw.replace(new RegExp(`^${config.switchPrefix} ?`, 'gu'), '');
            config.mode = newMode;
            reply(rawdata, false, `已切换模式至「${newMode}」。`);
            writeConfig(config, './config.js');
        } else {
            let question;
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
                    let images = rawdata.extra.images;
                    AIxxz(rawdata, question, images, (answer) => {
                        reply(rawdata, false, answer);
                    });
                    break;

                case 'pet':
                    let input = rawdata.raw;
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

                default:
                    reply(rawdata, false, '当前模式不存在，请检查设定。');
                    break;
            };
        };
    });
};
