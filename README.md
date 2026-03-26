# sublb-demo

这是一个给**小白**看的最小演示项目。

它要解决的问题只有一个：

> **怎么像调用普通 OpenAI 一样，去调用一个 OpenAI-compatible 网关，并且稳定拿到 JSON 结果。**

你不用先理解什么是 SSE、什么是聚合、什么是协议兼容。
你只要先记住一句话：

> **如果你只是想拿最终答案，就用 `stream: false`。**

这个仓库就是专门演示这件事的。

---

## 一、这个项目到底是干嘛的

很多人第一次接 OpenAI-compatible 网关时，会被这些词吓到：

- SSE
- 流式输出
- 非流式输出
- `chat/completions`
- `responses`
- `text/event-stream`
- `application/json`

其实你可以先把它理解成下面这个场景：

### 你真正关心的事情
你只是想发一个问题：

- “你好”
- “解释一下胰腺癌”
- “写一段总结”

然后接口返回一个标准 JSON：

```json
{
  "choices": [
    {
      "message": {
        "content": "这里是模型回复"
      }
    }
  ]
}
```

这就是大多数后端、脚本、前端最喜欢的形式。

---

## 二、什么是这个 Demo 要证明的事情

这个 Demo 要证明：

> **即使网关上游内部走的是 SSE，只要网关已经做了 SSE → JSON 聚合，你的客户端依然可以像普通 OpenAI API 一样拿 JSON。**

翻译成人话就是：

- 上游内部怎么传，不一定是你要关心的事
- 你作为调用方，完全可以继续按普通 JSON 接口来写
- 你不一定需要自己手搓 SSE 解析器

所以，对绝大多数业务开发来说：

### 你应该怎么做
- 如果你只想拿最终结果：`stream: false`
- 如果你想边生成边输出：`stream: true`

就这么简单。

---

## 三、这个仓库适合谁

如果你是下面这几类人，这个仓库就很适合你：

- 刚开始接 API 的前端同学
- 写 Python / Bash / Node 小工具的人
- 想快速验证自己网关能不能用的人
- 想给业务方做 Demo 的人
- 不想一上来就研究底层协议的人

如果你是纯小白，也没关系。
这个 README 就按“黑马培训班式”讲法来写，尽量让你一步一步照着跑。

---

## 四、目录结构

```text
sublb-demo/
├── .env.example
├── README.md
└── examples/
    ├── curl/
    │   ├── chat_json.sh
    │   └── responses_json.sh
    └── python/
        ├── chat_json_demo.py
        └── responses_json_demo.py
```

你可以把它理解成：

- `.env.example`：配置模板
- `examples/curl/`：用 curl 调接口的例子
- `examples/python/`：用 Python 调接口的例子

---

## 五、你只需要准备 3 个东西

在跑 Demo 之前，你只需要准备这 3 个参数：

1. `SUBLB_BASE_URL`：网关地址
2. `SUBLB_API_KEY`：你的 key
3. `SUBLB_MODEL`：模型名

例如：

```bash
SUBLB_BASE_URL=https://your-domain.example.com
SUBLB_API_KEY=your_api_key_here
SUBLB_MODEL=gpt-5.3-codex
```

---

## 六、第一步：配置环境变量

先复制模板：

```bash
cp .env.example .env
```

然后编辑 `.env`：

```bash
SUBLB_BASE_URL=https://your-domain.example.com
SUBLB_API_KEY=your_api_key_here
SUBLB_MODEL=gpt-5.3-codex
```

再把环境变量加载到当前终端：

```bash
set -a
source .env
set +a
```

如果你是第一次见这三行命令，可以这样理解：

- `set -a`：后面加载进来的变量自动导出
- `source .env`：把 `.env` 文件读进当前 shell
- `set +a`：恢复默认行为

### 验证有没有生效

你可以执行：

```bash
echo "$SUBLB_BASE_URL"
echo "$SUBLB_MODEL"
```

如果能看到你刚才填的值，说明配置已经生效。

---

## 七、最推荐的小白测试方式：先测 `chat/completions`

如果你是第一次跑，**建议先从 `chat/completions` 开始**。

因为它更符合大部分人对 OpenAI 接口的直觉。

直接运行：

```bash
./examples/curl/chat_json.sh
```

这个脚本会做 4 件事：

1. 调用 `POST /v1/chat/completions`
2. 明确带上 `stream: false`
3. 打印状态码
4. 打印最终 JSON 响应

### 你期望看到什么

理想情况下你会看到：

- 状态行是 `HTTP/1.1 200` 或 `HTTP/2 200`
- `Content-Type` 是 `application/json`
- 下面是一坨格式化后的 JSON

这就说明：

> **你的客户端现在拿到的是最终 JSON，不需要自己解析流。**

---

## 八、第二种测试方式：测 `responses`

如果你的网关也支持 `responses` 接口，再跑这个：

```bash
./examples/curl/responses_json.sh
```

这个脚本和前一个脚本的思路一样，只是接口地址换成了：

```text
POST /v1/responses
```

### 什么时候要测它

当你满足下面任一情况时，再去测 `responses`：

- 你明确知道自己的 SDK / 系统在走 `responses`
- 你要兼容某些新一代 OpenAI 调用方式
- 你就是想验证网关的 `responses` 是否可用

### 不确定就怎么办

不确定的时候，先别纠结。

**先用 `chat/completions`。**

这是更稳、更直观的起点。

---

## 九、如果你更喜欢 Python，就用这两个脚本

### 1）测试 `chat/completions`

```bash
python3 examples/python/chat_json_demo.py
```

### 2）测试 `responses`

```bash
python3 examples/python/responses_json_demo.py
```

这两个 Python 脚本会帮你打印：

- 状态码
- `Content-Type`
- 完整 JSON
- 从 JSON 里提取出的文本内容

也就是说，它不仅帮你请求，还帮你做了一点最基础的“读结果”工作。

---

## 十、你到底该选哪个接口

这是小白最容易卡住的问题。

直接给结论：

### 场景 1：你只是想让接口能稳定跑通
优先用：

```text
/v1/chat/completions
```

### 场景 2：你明确知道自己的系统在用 Responses API
再用：

```text
/v1/responses
```

### 场景 3：你完全搞不懂两者区别
那就先别研究概念，直接记这个口诀：

> **不确定时先上 `chat/completions`。**

---

## 十一、什么叫 `stream: false`

这个字段非常重要。

```json
{
  "stream": false
}
```

它的意思是：

> “我不要边生成边吐内容，我要你整理好以后，一次性把最终结果给我。”

### 小白可以这样理解

- `stream: true`：像直播，一点一点往外吐
- `stream: false`：像发快递，打包好了再一次性交给你

如果你只是做：

- shell 脚本
- 后端接口
- 简单前端请求
- 演示 demo

那通常 **`stream: false` 更省心**。

---

## 十二、为什么有些人会遇到“明明是非流式，结果还是收到 SSE”

这是很多网关场景里的坑。

你发的是：

- 非流式请求
- 想拿 JSON

但上游可能内部还是给你吐：

```text
text/event-stream
```

如果网关**没做聚合**，那调用方会看到：

- 一大坨 SSE 文本
- JSON 解析失败
- SDK 报错
- 或者前端/后端一脸懵

如果网关**做了 SSE → JSON 聚合**，那调用方就舒服了：

- 请求还是普通请求
- 返回还是普通 JSON
- 业务层不用管上游内部细节

这就是这个 demo 存在的意义。

---

## 十三、一个最小可复制的 curl 示例

如果你懒得跑脚本，直接手打 `curl` 也行。

### 1）`chat/completions`

```bash
curl "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @- <<JSON
{
  "model": "$SUBLB_MODEL",
  "stream": false,
  "messages": [
    {"role": "system", "content": "你是一个简洁的助手。"},
    {"role": "user", "content": "请用一句话解释什么是 SSE 转 JSON 聚合。"}
  ]
}
JSON
```

### 2）`responses`

```bash
curl "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @- <<JSON
{
  "model": "$SUBLB_MODEL",
  "input": "请用一句话解释为什么 SSE 转 JSON 聚合对客户端更友好。",
  "stream": false
}
JSON
```

---

## 十四、给最终用户怎么解释，最省事

如果你是做接口平台、网关平台，别人问你：

> “你们内部是不是 SSE？我要不要自己解析流？”

你可以直接这样说：

> 你不用关心我们上游内部是不是 SSE。只要你按标准 OpenAI 非流式 JSON 方式调用，并且设置 `stream: false`，你拿到的就是最终 JSON。你的客户端不需要自己写 SSE 解析逻辑。

这句话已经够业务同学理解了。

---

## 十五、常见报错怎么理解

### 1）报错：请先设置 `SUBLB_BASE_URL` 和 `SUBLB_API_KEY`
意思就是：

- 你还没加载 `.env`
- 或者 `.env` 里没填
- 或者当前 shell 没 `source .env`

解决办法：

```bash
set -a
source .env
set +a
```

---

### 2）状态码是 401 / 403
优先怀疑：

- key 不对
- 网关权限限制
- 请求被上游风控或安全策略拦截

这时候不要先改代码，先确认：

- base URL 对不对
- key 对不对
- 模型名对不对

---

### 3）状态码是 404
一般说明：

- 路径写错了
- `/v1` 漏了
- 接口路由不存在

比如你本来该调：

```text
https://xxx.com/v1/chat/completions
```

结果写成：

```text
https://xxx.com/chat/completions
```

那就可能直接 404。

---

### 4）拿到的不是 JSON，而是一坨流文本
说明大概率是：

- 网关没有做好 SSE → JSON 聚合
- 或者你自己把 `stream` 设成了 `true`

先检查请求体里是不是：

```json
{
  "stream": false
}
```

---

## 十六、实战建议：新手先按这个顺序排查

别一上来就研究复杂协议。
直接按下面顺序走：

### 第一步：先配 `.env`

```bash
cp .env.example .env
set -a
source .env
set +a
```

### 第二步：先跑 curl 版本的 `chat/completions`

```bash
./examples/curl/chat_json.sh
```

### 第三步：确认三件事
看输出里有没有：

- 200
- `Content-Type: application/json`
- 最终 JSON

### 第四步：再决定要不要测 `responses`

```bash
./examples/curl/responses_json.sh
```

### 第五步：最后再接入你自己的业务代码

这个顺序最省时间。

---

## 十七、如果你要接到 OpenClaw，应该怎么配

这一段是专门写给：

- 已经在用 OpenClaw 的人
- 想把这个网关直接接进 OpenClaw 的人
- 不想只停留在 curl 演示，而是想让机器人真正跑起来的人

你可以先把 OpenClaw 理解成：

> 一个会帮你把模型、渠道、工具、会话都串起来的“机器人外壳”。

而这个仓库里的网关，则是：

> OpenClaw 背后要连的模型接口。

也就是说，关系是：

```text
OpenClaw -> 你的 OpenAI-compatible 网关 -> 上游模型
```

---

## 十八、OpenClaw 最小配置长什么样

OpenClaw 的配置文件通常在：

```text
~/.openclaw/openclaw.json
```

如果你要把这个网关接到 OpenClaw，最小思路就是两件事：

1. 配一个 provider
2. 把默认模型指到这个 provider

一个最小可用示例如下：

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "sublb": {
        "baseUrl": "https://your-domain.example.com/v1",
        "apiKey": "your_api_key_here",
        "api": "openai-completions",
        "models": [
          {
            "id": "gpt-5.4",
            "name": "GPT-5.4 via SubLB",
            "input": ["text", "image"]
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "sublb/gpt-5.4"
      },
      "models": {
        "sublb/gpt-5.4": {}
      }
    },
    "list": [
      {
        "id": "main",
        "model": "sublb/gpt-5.4"
      }
    ]
  }
}
```

---

## 十九、这里每一项是什么意思

小白最怕的不是配置多，而是看不懂每个字段干嘛。

下面我直接翻译成人话。

### `baseUrl`

```json
"baseUrl": "https://your-domain.example.com/v1"
```

意思是：

> OpenClaw 以后发请求，就往这个地址打。

注意这里一般要带上 `/v1`。

很多人会漏掉 `/v1`，然后出现：

- 404
- 路由不对
- 看起来像接口挂了

其实只是路径写错了。

---

### `apiKey`

```json
"apiKey": "your_api_key_here"
```

意思是：

> 调这个网关时要带的密钥。

如果 key 不对，最常见就是：

- 401
- 403

---

### `api`

```json
"api": "openai-completions"
```

这一项非常重要。

它的意思不是“你模型是什么”，而是：

> OpenClaw 用哪一种 OpenAI 风格协议去跟你的网关讲话。

对于大多数新手场景，**建议优先用**：

```json
"api": "openai-completions"
```

原因很简单：

- 更稳
- 更直观
- 更接近大家熟悉的 `chat/completions`
- 很多兼容网关对这套支持更完整

如果你不确定，先别折腾 `openai-responses`。

**先把 `openai-completions` 跑通再说。**

---

### `models`

```json
"models": [
  {
    "id": "gpt-5.4",
    "name": "GPT-5.4 via SubLB",
    "input": ["text", "image"]
  }
]
```

意思是：

> 告诉 OpenClaw：这个 provider 下面有哪些模型可以选。

其中：

- `id`：真实模型名，发请求时会用到
- `name`：展示名，给人看的
- `input`：这个模型支持什么输入类型

---

### `primary`

```json
"primary": "sublb/gpt-5.4"
```

意思是：

> 默认就用这个模型。

如果你不写默认模型，后面有些 agent / channel 启动时就可能不知道该调谁。

---

## 二十、为什么推荐 OpenClaw 先走 `openai-completions`

这是给小白的经验结论，不讲虚的，直接讲实战：

很多 OpenAI-compatible 网关虽然嘴上说兼容 OpenAI，
但实际上常见情况是：

- `chat/completions` 能用
- `responses` 不一定稳
- 有的甚至对 `responses` 只做了半兼容

所以如果你是第一次接 OpenClaw：

### 最稳的起手式

- 接口先测：`/v1/chat/completions`
- OpenClaw 配置先写：`openai-completions`

这条路线最不容易翻车。

---

## 二十一、推荐的验证顺序

如果你要把它接进 OpenClaw，建议按这个顺序来：

### 第一步：先用 curl 验证网关本身通不通

```bash
./examples/curl/chat_json.sh
```

先确认：

- 200
- `application/json`
- 正常返回模型内容

### 第二步：再写 OpenClaw 配置

改：

```text
~/.openclaw/openclaw.json
```

把 provider 和默认模型加进去。

### 第三步：重启 OpenClaw gateway

如果你在 macOS 上本地跑 OpenClaw，最省事的方式有两种：

#### 方式 1：直接从 OpenClaw Mac App 里重启

适合纯小白。
你不用先研究 launchctl，直接在 OpenClaw 的 Mac 应用里重启 gateway 就行。

#### 方式 2：用仓库自带脚本重启

如果你本地就有 OpenClaw 源码仓库，可以用：

```bash
scripts/restart-mac.sh
```

重启完以后，建议马上做一次状态确认：

```bash
openclaw channels status --probe
```

如果你想进一步确认端口有没有起来，也可以看：

```bash
ss -ltnp | rg 18789
```

你不用死记命令，记住原则就行：

> **改完配置以后，一定要重启 gateway；重启以后，一定要做一次最小状态检查。**

### 第四步：再发一条最小测试消息

测试内容建议非常简单，比如：

```text
Reply with exactly pong and nothing else.
```

这样最容易判断：

- 到底是配置问题
- 还是模型回复内容太复杂
- 还是接口根本没打通

---

## 二十二、给 OpenClaw 用户的最小测试思路

如果你已经把配置写好了，接下来你最需要验证的是：

> **OpenClaw 到底有没有真的用上你这个 provider。**

最简单的办法就是：

1. 看默认模型是不是你写的那个
2. 看日志里有没有对应 provider / model
3. 发一条极短测试消息，看是否稳定返回

你不要一上来就发长文章任务。

小白最容易犯的错就是：

- 配置刚写完
- 还没做最小验证
- 就直接上复杂任务
- 然后出了问题也不知道是哪一层坏了

所以记住一句话：

> **先测通，再测复杂。**

---

## 二十三、一个已经验证过的实战经验

在真实测试里，`/v1/chat/completions` 这条链路通常比 `responses` 更适合作为第一步验收口。

也就是说，如果你的目标是：

- 先让 OpenClaw 跑起来
- 先让机器人能稳定回复
- 先给小白一个能照抄的配置

那建议你优先采用：

- 网关：`/v1/chat/completions`
- OpenClaw：`api = openai-completions`

这是更稳的入门路径。

---

## 二十四、一个已经验证过的真实例子

我们已经实测过下面这类调用是可行的：

- 接口：`/v1/chat/completions`
- 请求方式：非流式
- 请求字段：`stream: false`
- 返回：标准 JSON

也就是说，**对绝大多数业务方来说，先走 `chat/completions` 是最省脑子的方案**。

---

## 二十五、注意事项

1. **不要把真实 `.env` 提交到 GitHub。**
2. 公开仓库里只保留 `.env.example`。
3. 如果你只想拿最终结果，优先用 `stream: false`。
4. 如果你明确要做打字机效果，再考虑 `stream: true`。
5. 如果你是小白，不确定就先用 `chat/completions`，不要一开始就折腾 `responses`。

---

## 二十六、给小白的最终口诀

记住下面三句就够用了：

> **第一句：不确定时先用 `chat/completions`。**  
> **第二句：只想拿最终答案就用 `stream: false`。**  
> **第三句：看到 `application/json`，说明你拿到的是正常结果。**

---

## License

MIT
