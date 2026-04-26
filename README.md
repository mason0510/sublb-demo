# sublb-demo

一个公开的最小 Demo，主要演示两件事：

1. **OpenAI-compatible 网关即使上游内部返回 SSE，客户端在非流式调用下也能直接拿到标准 JSON**
2. **Sublb 生图对外 API 的真实接入口径、请求方式和真实产物位置**

这个仓库**不包含任何密钥**，只演示如何通过 API 形式调用网关，并保留真实运行产物。

> 如果你关心的是 **OpenClaw / Codex CLI / curl / Python SDK 为什么表现不一致**，请直接看：
>
> - [第三方客户端问题汇总.md](第三方客户端问题汇总.md)
> - [QA常见问题.md](QA常见问题.md)
>
> 如果你关心的是 **Sublb Grok / OpenAI 生图对外 API 与当前可对外展示口径**，请直接看：
>
> - [Sublb生图对外API文档.md](Sublb生图对外API文档.md)

## 如果你只关心生图

生图的统一入口只有一个：

| 入口 | 路径 | 分组 key | 模型 | 说明 |
|---|---|---|---|---|
| 生图 | `POST /v1/images/generations` | `pro` | `gpt-image-2` | OpenAI 生图分组；本轮已真实跑通，返回过 `b64_json` |
| 生图 | `POST /v1/images/generations` | `grok图片` | `grok-imagine-1.0` | Grok 生图分组；本轮可用 |
| 生图 | `POST /v1/images/generations` | `grok图文` | `grok-4.1-fast` / `grok-imagine-1.0` | 图文 key；文本/对话走 `grok-4.1-fast`，生图请求仍可传 `grok-imagine-1.0` |

完整接入步骤、请求体、响应体和可直接测试的 curl，都在：

- [Sublb生图对外API文档.md](Sublb生图对外API文档.md)

真实生图证据在这些目录里：

- `openai/`：OpenAI 生图相关真实返回
- `grok/`：Grok 生图相关真实返回
- `test_runs/`：按时间归档的真实验收产物

如果你只想看一次就懂，优先打开：

- `test_runs/20260426_120319_gpt_img_openai_image/`

---

## 先讲清楚这个仓库解决什么问题

这个仓库不是“完整网关项目”，而是一个**公开最小示例仓库**，专门解决下面这类沟通和验收问题：

1. 用户发的是**非流式请求**
2. 上游内部实际返回的是 `text/event-stream`
3. 但网关已经做了 **SSE → JSON 聚合**
4. 所以下游客户端最终仍然只需要按 **标准 JSON** 处理

一句话：

> **这个仓库的重点不是 SSE 本身，而是“客户端不用自己处理 SSE”。**

## 适用场景

如果你的网关已经做了 **SSE → JSON 聚合**，那么客户端只需要像普通 OpenAI API 一样发：

- `stream: false`
- `Accept: application/json`

客户端**不需要自己解析 SSE**。

也就是说：

- 上游内部可能是 `text/event-stream`
- 但你的调用方最终拿到的仍然是标准 JSON

## 目录

```text
sublb-demo/
├── .env.example
├── QA常见问题.md
├── Sublb生图对外API文档.md
├── 第三方客户端问题汇总.md
├── README.md
└── examples/
    ├── curl/
    │   ├── chat_json.sh
    │   └── responses_json.sh
    └── python/
        ├── chat_json_demo.py
        └── responses_json_demo.py
```

## QA 文档

- [QA常见问题.md](QA常见问题.md) ：汇总常见报错、服务器错误码、上游 429/502/超时/TLS 问题的处理方式。
- [第三方客户端问题汇总.md](第三方客户端问题汇总.md) ：专门汇总 OpenClaw、Codex CLI、curl、Python/OpenAI SDK 的常见兼容与排障问题。
- [Sublb生图对外API文档.md](Sublb生图对外API文档.md) ：面向外部接入方的生图对外 API 文档，包含分组 key、请求体、响应体和 curl 测试示例。

## 快速开始（最短路径）

如果你只想 3 分钟确认“我的网关是否已经把 SSE 聚合成 JSON”，按下面做：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
SUBLB_BASE_URL="https://your-domain.example.com"
SUBLB_API_KEY="your_api_key_here"
SUBLB_MODEL="gpt-5.4"
```

然后执行：

```bash
set -a
source .env
set +a

./examples/curl/responses_json.sh
```

你应该重点看两件事：

1. `HTTP status` 是否是 `200`
2. `Content-Type` 是否是 `application/json`

如果这两条成立，而且 body 是标准 JSON，而不是 `data: ...` 这种 SSE 文本，就说明：

> 你的网关已经完成了 **SSE → JSON 聚合**。

## 1. 配置环境变量

复制一份环境变量模板：

```bash
cp .env.example .env
```

然后填写 `.env`，再把它导入当前 shell：

```bash
cat .env
set -a
source .env
set +a
```

> 不要把真实密钥提交到 GitHub。

如果你想直接在命令前临时传入，也可以：

```bash
SUBLB_BASE_URL="https://your-domain.example.com" \
SUBLB_API_KEY="your_api_key_here" \
SUBLB_MODEL="gpt-5.3-codex" \
./examples/curl/responses_json.sh
```

### 推荐的模型选择

如果你只是做链路验证，建议默认先用：

```bash
SUBLB_MODEL="gpt-5.4"
```

原因很简单：

- 它是当前更稳的基准模型
- 方便和 QA 文档、第三方客户端文档保持一致
- 可以先排除“某个特定模型不可用”这种干扰项

## 2. 用 curl 调 `/v1/responses`

```bash
./examples/curl/responses_json.sh
```

这个示例会：

1. 发送一个**非流式** `/v1/responses` 请求
2. 打印响应状态码
3. 打印响应 `Content-Type`
4. 打印最终 JSON body

关键点：请求体里显式带了：

```json
{
  "stream": false
}
```

这表示你希望拿到**最终 JSON 结果**，而不是逐 chunk 的 SSE。

### 你应该预期看到什么

理想情况下输出里会出现：

- `HTTP status: 200`
- `Content-Type: application/json`
- body 里有标准 JSON 字段，例如：
  - `id`
  - `object`
  - `output`
  - `usage`

### 哪种结果说明你还没聚合成功

如果你看到的是这类内容：

```text
data: {"id":"..."}

data: {"type":"response.completed", ...}
```

说明你拿到的还是原始 SSE，而不是最终 JSON。

## 3. 用 curl 调 `/v1/chat/completions`

```bash
./examples/curl/chat_json.sh
```

这同样是**非流式**调用。

如果你的网关已做 SSE → JSON 聚合，那么即使上游兼容服务内部返回 SSE，客户端这里也仍然收到普通 JSON。

### 什么时候优先测 `/v1/chat/completions`

如果你在排查第三方客户端兼容问题，建议同时测两条：

1. `/v1/responses`
2. `/v1/chat/completions`

因为有些第三方客户端只实现了其中一条，或者两条的兼容性并不一样。

## 4. 用 Python 调 `/v1/responses`

```bash
python3 examples/python/responses_json_demo.py
```

脚本会输出：

- HTTP 状态码
- `Content-Type`
- 完整 JSON
- 自动提取的文本内容

这很适合给后端工程师演示：

> 不需要自己写 SSE 解析器，也不需要额外拼接 chunk，直接按普通 JSON 读取即可。

## 5. 用 Python 调 `/v1/chat/completions`

```bash
python3 examples/python/chat_json_demo.py
```

## 6. 你该怎么向最终用户解释这件事

可以直接这样说：

> 你只需要按标准 OpenAI 非流式 JSON 方式调用我们的 API。即使上游内部是 SSE，网关也会替你聚合成最终 JSON 返回。你的客户端不需要自己写 SSE 解析器。

## 7. 为什么这件事重要

有些 OpenAI-compatible 上游会出现下面这种情况：

- 你发的是非流式请求
- 但上游实际返回了 `text/event-stream`
- 如果网关不做聚合，客户端就会收到一坨 SSE 文本，甚至报 `invalid json response`

而做完 SSE → JSON 聚合后：

- 客户端协议稳定
- SDK / curl / 后端服务都可以继续按普通 JSON 来处理
- 不需要把上游的协议异常泄露给业务方

## 8. 和第三方客户端问题的关系

这个仓库本身只演示“**网关是否正确聚合 JSON**”，不直接替代第三方客户端排障。

你可以这样理解：

- `README.md`：看**网关最小行为**
- `第三方客户端问题汇总.md`：看**不同客户端为什么会误判**
- `QA常见问题.md`：看**服务端错误码和常见 4xx/5xx 问题**

## 9. 一个最小请求示例

### `/v1/responses`

```bash
curl "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @- <<JSON
{
  "model": "$SUBLB_MODEL",
  "input": "请用一句话解释为什么 SSE → JSON 聚合对客户端更友好。",
  "stream": false
}
JSON
```

### `/v1/chat/completions`

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
    {"role": "user", "content": "请用一句话解释什么是 SSE → JSON 聚合。"}
  ]
}
JSON
```

## 10. 注意事项

1. 如果你要真正消费 SSE，请把 `stream` 设为 `true`，然后用流式客户端处理。
2. 如果你只想拿最终结果，请坚持走 `stream: false`。
3. 如果响应头已经是 `application/json`，说明网关已经完成了聚合。
4. 公开仓库里只保留 `.env.example`，不要提交 `.env`、本地日志、真实密钥。
5. 如果你要排 OpenClaw / Codex CLI / SDK 问题，先别在客户端里空猜，先跑这个仓库里的 curl 示例确认网关基线行为。

## License

MIT
