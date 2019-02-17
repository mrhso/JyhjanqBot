// 请参照注释进行设定
// 设定好之后，请将档案更名为 config.js

module.exports = {
    "host": "127.0.0.1",                                 // 酷 Q 所在环境的 IP
    "port": 11235,                                       // 酷 Q 的通信端口
    "CoolQPro": false,                                   // 如果是酷 Q Pro，请将其设定为 true
    "mode": "active",                                    // active 为主动打喷模式
                                                         // passive 为被动打喷模式，被 at 及私聊时会打喷
                                                         // chishoh 为人工池沼模式，建议将 sleep 设定为 0，更有人工池沼的感觉
                                                         // AIxxz 为小信子模式，同样建议将 sleep 设定为 0。不过这个是真·人工池沼，啊啊
                                                         // pet 为宠爱世界模式，迫真养宠物实则骗红包的致郁游戏
                                                         // gong 为 AlphaGong 模式，龚诗生成器
                                                         // kufon 为 AlphaKufon Zero 模式，迫真古风生成器
                                                         // gt 为 Google 翻译模式
                                                         // gtRound 为 Google 来回翻译模式，翻译过去再翻译回来
                                                         // couplet 为对对联模式
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
    "lang": "zh_CN",                                     // 小信子语文，已知 zh_CN、zh_TW、zh_HK
    "nickname": "",                                      // 小信子有效，用户昵称
                                                         // 若指定为空，则为群名片或 QQ 昵称
                                                         // 实际上未指定该参数或 API 无法识别时，返回为「互动者」
    "city": "",                                          // 小信子有效，用户城市
                                                         // 这个查天气有用
    "modeSwitch": "",                                    // 模式切换，留空则关闭
                                                         // 支持 CQ 码、正则表达式，注意 CQ 码转义、JS 转义、正则表达式转义
                                                         // 例如「^&#91;mode&#93; ?」
    "gtSrc": "auto",                                     // Google 翻译源语文
    "gtTgt": "en",                                       // Google 翻译目标语文
    "gtSrcSwitch": "",                                   // Google 翻译源语文切换，用法同 modeSwitch
    "gtTgtSwitch": "",                                   // Google 翻译目标语文切换，用法同 modeSwitch
    "gtSwapSwitch": "",                                  // Google 翻译源语文与目标语文交换，用法同 modeSwitch
    "gModeSwitch": "",                                   // modeSwitch 单群版
    "gGtSrcSwitch": "",                                  // gtSrcSwitch 单群版
    "gGtTgtSwitch": "",                                  // gtTgtSwitch 单群版
    "gGtSwapSwitch": "",                                 // gtSwapSwitch 单群版
    "pModeSwitch": "",                                   // modeSwitch 单 QQ 版
    "pGtSrcSwitch": "",                                  // gtSrcSwitch 单 QQ 版
    "pGtTgtSwitch": "",                                  // gtTgtSwitch 单 QQ 版
    "pGtSwapSwitch": ""                                  // gtSwapSwitch 单 QQ 版
};
