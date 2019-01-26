# 多功能人工池沼
## 特点
本机器人有三个模式：
* 主动打喷模式
* 被动打喷模式
* 人工池沼模式

## 使用方法
首先准备好依赖。
* 安装 Node.js。
* 下载[酷 Q](https://cqp.cc/)。
* 下载 [me.cqp.ishisashi.cqsocketapi.cpk](https://dl.bintray.com/mrhso/cqsocketapi/me.cqp.ishisashi.cqsocketapi.cpk)，放入酷 Q 的 app 目录。
* 启用插件「CoolQ Socket API (Node.js)」。
* 下载机器人本体。
* 执行：
```
npm install
```
这样依赖都准备好了。接下来请编辑 config.example.js 设定机器人，如果有需要的话就编辑 text.example.js 来定义合适的文本。

编辑完毕后，将 config.example.js 与 text.example.js 分别更名为 config.js 与 text.js。

打开酷 Q，然后执行：
```
node main.js
```
