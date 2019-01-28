const QQBot = require('./lib/QQBot.js');
const http = require('http');
const {TextEncoder, TextDecoder} = require('text-encoding');

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

function daapen() {
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

async function daapenActive() {
    for (let i = 1; i <= (config.count || 100); i ++) {
        let random = daapen();
        // 延时
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

function daapenPassive() {
    qqbot.on('GroupMessage', async (rawdata) => {
        if (rawdata.extra.ats.indexOf(config.id) > -1) {
            let random = daapen();

            if (config.sleep === undefined ? true : config.sleep) {
                await sleep((config.sleep || 100) * [...random].length);
            };

            qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${random}`, {noEscape: true});
            pluginManager.log(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${random}`);
        };
    });

    qqbot.on('PrivateMessage', async (rawdata) => {
        let random = daapen();

        if (config.sleep === undefined ? true : config.sleep) {
            await sleep((config.sleep || 100) * [...random].length);
        };

        qqbot.sendPrivateMessage(rawdata.from, random);
        pluginManager.log(`Output: ${random}`);
    });
};

function jinkohChishohAnswer(question) {
    let answer = question;

    if(answer.search(/[一-龥][？\?]/g) > -1) {
        answer = answer.replace(/([啊吗嗎吧呢的]+)?[？\?]/g, "！").replace(/我/g, "\uD800").replace(/[你您]/g, "我").replace(/\uD800([^\uDC00-\uDFFF])|\uD800$/g, "你$1").replace(/(.)[不没沒]\1/g, "$1").replace(/难道/g, "当然").replace(/難道/g, "當然").replace(/哪里/g, "台湾").replace(/哪[裏裡]/g, "台灣").replace(/[谁誰]/g, "蔡英文").replace(/究竟[^然]|究竟$|到底/g, "就").replace(/为什么/g, "因为非常大颗").replace(/為什麼/g, "因為非常大顆").replace(/什么/g, "竞选").replace(/什麼/g, "競選");
    };

    if(answer.search(/[a-zA-Zａ-ｚＡ-Ｚ][？\?]/g) > -1) {
        if(answer.search(/^[cCｃＣ][aAａＡ][nNｎＮ]/g) > -1) {
            answer = "Yes, I can!";
        };
    };

    return answer;
};

function jinkohChishoh() {
    qqbot.on('GroupMessage', async (rawdata) => {
        if (rawdata.extra.ats.indexOf(config.id) > -1) {
            let question = rawdata.text.replace(new RegExp(`@${config.id} ?`, "g"), "");
            let answer = jinkohChishohAnswer(question);

            if(answer !== question) {
                if (config.sleep === undefined ? true : config.sleep) {
                    await sleep((config.sleep || 100) * [...answer].length);
                };

                qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${answer}`, {noEscape: true});
                pluginManager.log(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${answer}`);
            };
        };
    });

    qqbot.on('PrivateMessage', async (rawdata) => {
        let question = rawdata.text;
        let answer = jinkohChishohAnswer(question);

        if(answer !== question) {
            if (config.sleep === undefined ? true : config.sleep) {
                await sleep((config.sleep || 100) * [...answer].length);
            };

            qqbot.sendPrivateMessage(rawdata.from, answer);
            pluginManager.log(`Output: ${answer}`);
        };
    });
};

function AIxxzAnswer(question, images, callback) {
    if (images.length === 0) {
        let reqUK = http.request({host: 'get.xiaoxinzi.com', path: '/app_event.php', method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}}, (res) => {
            res.on('data', (chunk) => {
                // 取得 Userkey
                let uk = JSON.parse(chunk.toString()).data.UniqueDeviceID.uk;
                // 请求回答
                let reqAnswer = http.request({host: 'ai.xiaoxinzi.com', path: '/api3.php', method: 'POST', headers: {'content-type': 'application/x-www-form-urlencoded'}}, (res) => {
                    res.on('data', async (chunk) => {
                        // 先用数组存储回答，因为小信子的返回格式比较复杂
                        let answer = [];
                        if (Array.isArray(JSON.parse(chunk.toString()).data)) {
                            for (let data in JSON.parse(chunk.toString()).data) {
                                // 有时数组里面还包着对象
                                for (let data2 in JSON.parse(chunk.toString()).data[data]) {
                                    answer.push(JSON.parse(chunk.toString()).data[data][data2]);
                                };
                            };
                        } else if (Object.prototype.toString.call(JSON.parse(chunk.toString()).data) === '[object Object]') {
                            for (let data in JSON.parse(chunk.toString()).data) {
                                answer.push(JSON.parse(chunk.toString()).data[data]);
                            };
                        } else {
                            answer.push(JSON.parse(chunk.toString()).data);
                        };
                        // 将数组转为换行字符串
                        answer = answer.join("\n");
                        callback(answer);
                        // 如果是提醒的话，处理提醒时间
                        if (JSON.parse(chunk.toString()).xxztype === "remind") {
                            // 处理小信子返回的时间，注意时区为 UTC+8
                            let remindTime = new Date(`${JSON.parse(chunk.toString()).semantic.start_date} ${JSON.parse(chunk.toString()).semantic.start_time} UTC+0800`);
                            let remindMessage = JSON.parse(chunk.toString()).semantic.message;
                            if (config.lang === "zh_TW" || config.lang === "zh_HK") {
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
                reqAnswer.write(`app=${config.appid || "dcXbXX0X"}&dev=${config.devid || "UniqueDeviceID"}&uk=${uk}&text=${question}&lang=${config.lang || "zh_CN"}`);
                reqAnswer.end();
            });
        });
        reqUK.write(`secret=${config.appid || "dcXbXX0X"}|${config.ak || "5c011b2726e0adb52f98d6a57672774314c540a0"}|${config.token || "f9e79b0d9144b9b47f3072359c0dfa75926a5013"}&event=GetUk&data=["${config.devid || "UniqueDeviceID"}"]`);
        reqUK.end();
    } else if (images.join(",").search(".gif") > -1) {
        if (config.lang === "zh_TW" || config.lang === "zh_HK") {
            let answer = "那就不曉得了。";
        } else {
            let answer = "那就不晓得了。";
        };
        callback(answer);
    } else {
        let answer = "收到图片";
        callback(answer);
    };
};

function AIxxz() {
    qqbot.on('GroupMessage', (rawdata) => {
        if (rawdata.extra.ats.indexOf(config.id) > -1) {
            let question = rawdata.text.replace(new RegExp(`@${config.id} ?`, "g"), "");
            let images = rawdata.extra.images;

            AIxxzAnswer(question, images, async (answer) => {
                if (config.sleep === undefined ? true : config.sleep) {
                    await sleep((config.sleep || 100) * [...answer].length);
                };

                qqbot.sendGroupMessage(rawdata.group, `[CQ:at,qq=${rawdata.from}] ${answer}`, {noEscape: true});
                pluginManager.log(`Output: @${rawdata.user.groupCard || rawdata.user.name || rawdata.user.qq.toString()} ${answer}`);
            });
        };
    });

    qqbot.on('PrivateMessage', (rawdata) => {
        let question = rawdata.text;
        let images = rawdata.extra.images;

        AIxxzAnswer(question, images, async (answer) => {
            if (config.sleep === undefined ? true : config.sleep) {
                await sleep((config.sleep || 100) * [...answer].length);
            };

            qqbot.sendPrivateMessage(rawdata.from, answer);
            pluginManager.log(`Output: ${answer}`);
        });
    });
};

if (config.mode === "active") {
    daapenActive();                     // 主动打喷
} else if (config.mode === "passive") {
    daapenPassive();                    // 被动打喷
} else if (config.mode === "chishoh") {
    jinkohChishoh();                    // 人工智障（Jinkō Chishō），现代日本语与「人工池沼」同音
                                        // 或许也可以用国语罗马字，叫 Rengong Jyhjanq，甚至 Rengong Chyrjao
} else if (config.mode === "AIxxz") {
    AIxxz();                            // 小信子，真·人工池沼
};
