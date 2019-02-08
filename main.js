const QQBot = require('./lib/QQBot.js');
const http = require('http');

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
    port: config.port || 11235,
    CoolQPro: config.CoolQPro
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

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const toLF = (str) => {
    return str.replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
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

    // TODO 将消息所含的 @ 替换为名片
    if (isGroup) {
        if (rawdata.from === 80000000) {
            qqbot.sendGroupMessage(rawdata.group, message, { noEscape: true });
            pluginManager.log(`Output: ${qqbot.parseMessage(message).text}`);
        } else {
            qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${message}`, { noEscape: true });
            pluginManager.log(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${qqbot.parseMessage(message).text}`);
        };
    } else {
        qqbot.sendPrivateMessage(rawdata.from, message, { noEscape: true });
        pluginManager.log(`Output: ${qqbot.parseMessage(message).text}`);
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
            qqbot.sendGroupMessage(config.to, random);
        } else {
            qqbot.sendPrivateMessage(config.to, random);
        };
        pluginManager.log(`Output: ${random}`);
    };
};

const daapenPassive = () => {
    qqbot.on('GroupMessage', (rawdata) => {
        if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
            let random = daapen();
            reply(rawdata, true, random);
        };
    });

    qqbot.on('PrivateMessage', (rawdata) => {
        let random = daapen();
        reply(rawdata, false, random);
    });
};

const jinkohChishohAnswer = (question) => {
    let answer = question;

    if(answer.search(/[一-龥][？\?]/gu) > -1) {
        answer = answer.replace(/([啊吗嗎吧呢的]+)?[？\?]/gu, '！')
                       .replace(/我/gu, '\uD800').replace(/[你您]/gu, '我').replace(/\uD800/gu, '你')
                       .replace(/(.)[不没沒]\1/gu, '$1')
                       .replace(/难道/gu, '当然').replace(/難道/gu, '當然')
                       .replace(/哪里/gu, '台湾').replace(/哪[裏裡]/gu, '台灣')
                       .replace(/[谁誰]/gu, '蔡英文')
                       .replace(/竟然/gu, '\uD800').replace(/究竟|到底/gu, '就').replace(/\uD800/gu, '竟然')
                       .replace(/为什么/gu, '因为非常大颗').replace(/為什麼/gu, '因為非常大顆')
                       .replace(/什么/gu, '竞选').replace(/什麼/gu, '競選');
    };

    if(answer.search(/[a-zA-Zａ-ｚＡ-Ｚ][？\?]/gu) > -1) {
        if(answer.search(/^[cCｃＣ][aAａＡ][nNｎＮ]/gu) > -1) {
            answer = 'Yes, I can!';
        };
    };

    return answer;
};

const jinkohChishoh = () => {
    qqbot.on('GroupMessage', (rawdata) => {
        if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
            let question = rawdata.raw.replace(new RegExp(`\\[CQ:at,qq=${qqbot.qq}\\] ?`, 'gu'), '');
            let answer = jinkohChishohAnswer(question);

            if(answer !== question) {
                reply(rawdata, true, answer, { noEscape: true });
            };
        };
    });

    qqbot.on('PrivateMessage', (rawdata) => {
        let question = rawdata.raw;
        let answer = jinkohChishohAnswer(question);

        if(answer !== question) {
            reply(rawdata, false, answer, { noEscape: true });
        };
    });
};

const AIxxzAnswer = (userID, nickname, question, images, callback) => {
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
                reqAnswer.write(`app=${config.appid || 'dcXbXX0X'}&dev=${config.devid || 'UniqueDeviceID'}&uk=${uk}&text=${question}&lang=${config.lang || 'zh_CN'}&nickname=${nickname}&user=${userID}&city=${config.city}`);
                reqAnswer.end();
            });
        });
        reqUK.write(`secret=${config.appid || 'dcXbXX0X'}|${config.ak || '5c011b2726e0adb52f98d6a57672774314c540a0'}|${config.token || 'f9e79b0d9144b9b47f3072359c0dfa75926a5013'}&event=GetUk&data=["${config.devid || 'UniqueDeviceID'}"]`);
        reqUK.end();
    } else if (images.join(',').search(/\.gif/gu) > -1) {
        if (config.lang === 'zh_TW' || config.lang === 'zh_HK') {
            let answer = '那就不曉得了。';
        } else {
            let answer = '那就不晓得了。';
        };
        callback(answer);
    } else {
        let answer = '收到图片';
        callback(answer);
    };
};

const AIxxz = () => {
    qqbot.on('GroupMessage', (rawdata) => {
        if (rawdata.extra.ats.indexOf(qqbot.qq) > -1) {
            let userID = rawdata.from;
            let nickname;
            if (config.nickname) {
                nickname = config.nickname;
            } else if (rawdata.from === 80000000) {
                nickname = rawdata.user.groupCard;
            } else {
                nickname = rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString();
            };
            let question = rawdata.text.replace(new RegExp(`@${qqbot.qq} ?`, 'gu'), '');
            let images = rawdata.extra.images;

            AIxxzAnswer(userID, nickname, question, images, (answer) => {
                reply(rawdata, true, answer);
            });
        };
    });

    qqbot.on('PrivateMessage', (rawdata) => {
        let userID = rawdata.from;
        let nickname;
        if (config.nickname) {
            nickname = config.nickname;
        } else {
            nickname = rawdata.user.name || rawdata.user.qq.toString();
        };
        let question = rawdata.text;
        let images = rawdata.extra.images;

        AIxxzAnswer(userID, nickname, question, images, (answer) => {
            reply(rawdata, false, answer);
        });
    });
};

if (config.mode === 'active') {
    daapenActive();                     // 主动打喷
} else if (config.mode === 'passive') {
    daapenPassive();                    // 被动打喷
} else if (config.mode === 'chishoh') {
    jinkohChishoh();                    // 人工智障（Jinkō Chishō），现代日本语与「人工池沼」同音
                                        // 或许也可以用国语罗马字，叫 Rengong Jyhjanq，甚至 Rengong Chyrjao
} else if (config.mode === 'AIxxz') {
    AIxxz();                            // 小信子，真·人工池沼
};
