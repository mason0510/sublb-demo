# sublb-demo

一个公开的最小 Demo：演示 **OpenAI-compatible 网关即使上游内部返回 SSE，客户端在非流式调用下也能直接拿到标准 JSON**。

这个仓库**不包含任何密钥**，只演示如何通过 API 形式调用网关。

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

## 3. 用 curl 调 `/v1/chat/completions`

```bash
./examples/curl/chat_json.sh
```

这同样是**非流式**调用。

如果你的网关已做 SSE → JSON 聚合，那么即使上游兼容服务内部返回 SSE，客户端这里也仍然收到普通 JSON。

## 4. 用 Python 调 `/v1/responses`

```bash
python3 examples/python/responses_json_demo.py
```

脚本会输出：

- HTTP 状态码
- `Content-Type`
- 完整 JSON
- 自动提取的文本内容

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

## 8. 一个最小请求示例

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

## 9. 注意事项

1. 如果你要真正消费 SSE，请把 `stream` 设为 `true`，然后用流式客户端处理。
2. 如果你只想拿最终结果，请坚持走 `stream: false`。
3. 如果响应头已经是 `application/json`，说明网关已经完成了聚合。
4. 公开仓库里只保留 `.env.example`，不要提交 `.env`、本地日志、真实密钥。

## License

MIT
