# 智障 Bot
|语言|名称|
|-|-|
|官话（普通话）|<ruby>智<rp>（</rp><rt>zhì</rt><rp>）</rp></ruby><ruby>障<rp>（</rp><rt>zhàng</rt><rp>）</rp></ruby> Bot|
|日本语|<ruby>智<rp>（</rp><rt>ち</rt><rp>）</rp></ruby><ruby>障<rp>（</rp><rt>しょう</rt><rp>）</rp></ruby> <ruby>Bot<rp>（</rp><rt>ボット</rt><rp>）</rp></ruby>|
|朝鲜语（文化语）|<ruby>智<rp>（</rp><rt>지</rt><rp>）</rp></ruby><ruby>障<rp>（</rp><rt>장</rt><rp>）</rp></ruby> <ruby>Bot<rp>（</rp><rt>보트</rt><rp>）</rp></ruby>|
|朝鲜语（南朝鲜标准语）|<ruby>智<rp>（</rp><rt>지</rt><rp>）</rp></ruby><ruby>障<rp>（</rp><rt>장</rt><rp>）</rp></ruby> <ruby>Bot<rp>（</rp><rt>봇</rt><rp>）</rp></ruby>|

官方拉丁转写为以国语罗马字拼写的「智障 Bot」，即「Jyhjanq Bot」。

日本语「Chishō Bot」（纯 ASCII 写作「Chishoh Bot」）、朝鲜语「Jijang Bot」为许容写法。

## 特点
本人工池沼为多功能人工池沼，功能如下：
- 人工池沼模式
- 小信子模式
- 宠爱世界模式
- AlphaGong 模式
- AlphaKufon Zero 模式
- Google 翻译模式
- Google 来回翻译模式
- 对对联模式
- 编码查询模式
- 百度翻译模式
- 百度来回翻译模式
- 阴阳怪气模式
- 售壬控模拟器模式
- 营销号模拟器模式
- 动态组字模式
- InChI 转结构模式

## 使用方法
首先准备好依赖。
- 安装 Node.js。
- 下载[酷 Q](https://cqp.cc/)。
- 下载 [me.cqp.ishisashi.cqsocketapi.cpk](https://dl.bintray.com/mrhso/cqsocketapi/me.cqp.ishisashi.cqsocketapi.cpk)，放入酷 Q 的 app 目录。
- 启用插件「CoolQ Socket API (Node.js)」。
- 下载机器人本体。
- 执行：
```
npm install
```

这样依赖都准备好了。接下来请编辑 config.example.js 设定机器人，如果有需要的话就编辑 text 内的数据。

打开酷 Q，然后执行：
```
node main.js
```

## 历史
0.0.1919810 加入人工池沼模式。

1.1.0 加入小信子模式。

1.2.0 正式加入某致郁游戏，不过文本很是缺乏。

1.3.0 将原 Excel AlphaGong 移植入智障 Bot。

1.3.5 移植 Excel AlphaKufon Zero，并加入切换模式功能。

1.4.0 加入 Google 翻译模式。

1.4.5 加入 Google 来回翻译模式。

1.5.0 加入对对联模式，并可对单 QQ、单群设定，防止多人使用产生冲突。

1.5.1 加入编码查询模式。

1.5.2 加入百度（及来回）翻译模式。

1.6.0 加入作诗模式。

1.7.0 加入阴阳怪气模式，并处理小信子的 UUID 部分，实现用户分离。

1.8.0 加入售壬控模拟器模式。

1.8.1 对小信子模式进行图片处理，并加入容灾措施。

1.8.2 除小信子模式以外，回调全部 async-await 化。

1.8.3 移除作诗模式。

1.8.4 移植「营销号，如紫火般燃烧」。

1.8.5 修复 Google 翻译模式。

1.8.6 加入动态组字模式，修复 `node-fetch`，将 `nodejieba` 替换为 `@node-rs/jieba`，加入版本号显示。

1.8.7 加入 InChI 转结构模式。
