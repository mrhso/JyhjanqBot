// 请参照注释进行设定
// 设定好之后，请将档案更名为 config.js

module.exports = {
    "host": "127.0.0.1",                                 // 酷 Q 所在环境的 IP
    "port": 11235,                                       // 酷 Q 的通信端口
    "CoolQAirA": false,                                  // 如果是酷 Q Air（A 组），请将其设定为 true
    "mode": "chishoh",                                   // chishoh 为人工池沼模式
                                                         // AIxxz 为小信子模式。不过这个是真·人工池沼，啊啊
                                                         // pet 为宠爱世界模式，迫真养宠物实则骗红包的致郁游戏
                                                         // gong 为 AlphaGong 模式，龚诗生成器
                                                         // kufon 为 AlphaKufon Zero 模式，迫真古风生成器
                                                         // gt 为 Google 翻译模式
                                                         // gtRound 为 Google 来回翻译模式，翻译过去再翻译回来
                                                         // couplet 为对对联模式
                                                         // code 为编码查询模式，查询字符之编码
                                                         // bf 为百度翻译模式
                                                         // bfRound 为百度来回翻译模式
                                                         // poem 为作诗模式
                                                         // jiowjeh 为阴阳怪气模式
                                                         // wtfurry 为售壬控模拟器模式
    "appid" : "dcXbXX0X",                                // 小信子 AppID
    "ak": "5c011b2726e0adb52f98d6a57672774314c540a0",    // 小信子 Authkey
    "token": "f9e79b0d9144b9b47f3072359c0dfa75926a5013", // 小信子 Token
    "lang": "zh_CN",                                     // 小信子语文，已知 zh_CN、zh_TW、zh_HK
    "city": "",                                          // 小信子有效，用户城市
                                                         // 这个查天气有用
    "modeSwitch": "",                                    // 模式切换，留空则关闭
                                                         // 支持 CQ 码、正则表达式，注意 CQ 码转义、JS 转义、正则表达式转义
                                                         // 例如「^&#91;mode&#93; ?」
    "gtSrc": "auto",                                     // Google 翻译源语文
                                                         // 这类参数与百度翻译模式共用，下文同
    "gtTgt": "en",                                       // Google 翻译目标语文
    "gtSrcSwitch": "",                                   // Google 翻译源语文切换，用法同 modeSwitch
    "gtTgtSwitch": "",                                   // Google 翻译目标语文切换，用法同 modeSwitch
    "gtSwapSwitch": "",                                  // Google 翻译源语文与目标语文交换，用法同 modeSwitch
    "gModeSwitch": "",                                   // modeSwitch 单群版
    "gGtSrcSwitch": "",
    "gGtTgtSwitch": "",
    "gGtSwapSwitch": "",
    "pModeSwitch": "",                                   // modeSwitch 单 QQ 版
    "pGtSrcSwitch": "",
    "pGtTgtSwitch": "",
    "pGtSwapSwitch": "",
    "langSwitch": "",
    "citySwitch": "",
    "gLangSwitch": "",
    "gCitySwitch": "",
    "pLangSwitch": "",
    "pCitySwitch": "",
    "simply": false,                                     // 将预设词库为繁体的模式之输出转化为简化字
    "forceWriteSwitch": ""                               // 容灾措施
                                                         // 若误操作删除数据，可以在重启之前通过该指令强制写入
};
