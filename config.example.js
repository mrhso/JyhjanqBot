// 请参照注释进行设定
// 设定好之后，请将档案更名为 config.js

module.exports = {
    "host": "127.0.0.1",                                 // 酷 Q 所在环境的 IP
    "port": 11235,                                       // 酷 Q 的通信端口
    "id": "10000",                                       // 机器人本身的 QQ 号
    "mode": "active",                                    // active 为主动打喷模式
                                                         // passive 为被动打喷模式，被 at 及私聊时会打喷
                                                         // chishoh 为人工池沼模式，建议将 sleep 设定为 0，更有人工池沼的感觉
                                                         // AIxxz 为小信子模式，同样建议将 sleep 设定为 0。不过这个是真·人工池沼，啊啊
    "isGroup": true,                                     // 主动打喷模式有效，true 为群，false 为私聊
    "to": "10000",                                       // 主动打喷模式有效，目的 QQ 群号或 QQ 号
    "count": 100,                                        // 主动打喷模式有效，消息总数
    "sleep": 100,                                        // 单字符延时（毫秒），单字符延时 × 字符数 = 字符串延时
                                                         // 设定为 false 或 0 则不延时，不建议在主动打喷模式下零延时
    "unique": false,                                     // 打喷模式有效，true 则喷辞不重复（文本用尽后会重置），false 允许重复
    "appid" : "dcXbXX0X",                                // 小信子 AppID
    "ak": "5c011b2726e0adb52f98d6a57672774314c540a0",    // 小信子 Authkey
    "token": "f9e79b0d9144b9b47f3072359c0dfa75926a5013", // 小信子 Token
    "devid": "UniqueDeviceID",                           // 小信子 DevID
    "lang": "zh_CN"                                      // 小信子语文，已知 zh_CN、zh_TW
};
