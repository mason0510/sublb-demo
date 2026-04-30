# SubLB Grok / OpenAI / Gemini / Claude API 接入指南

测试日期：2026-04-30

文档版本：v1.4

## 开篇：先把接入路径说清楚

SubLB 对外提供一个统一的 OpenAI-compatible Base URL。接入方不需要关心后面接的是 Grok、OpenAI、Gemini 还是 Claude，先拿到对应分组 Key，再按业务场景选择接口和模型即可。

最短路径是三步：

1. 选择分组 Key：文本、图片、Claude 原生能力通常使用不同分组 Key。
2. 选择接口：聊天走 `/v1/chat/completions`，Responses 客户端走 `/v1/responses`，生图走 `/v1/images/generations`，图片编辑走 `/v1/images/edits`，Claude 原生走 `/v1/messages`。
3. 选择模型：只使用本文列出的推荐模型；未列出的模型以你手里的分组权限和实际业务接口结果为准。

## 一张图说清楚

```mermaid
flowchart TD
  A[拿到 SubLB 分组 Key] --> B{你要做什么}
  B -->|普通文本对话| C["POST /v1/chat/completions"]
  B -->|OpenAI Responses 客户端| D["POST /v1/responses"]
  B -->|生图| E["POST /v1/images/generations"]
  B -->|图片编辑| F["POST /v1/images/edits"]
  B -->|Claude 原生 Messages| G["POST /v1/messages"]

  C --> C1[grok-4.1-fast]
  C --> C2[gpt-5.5]
  C --> C3[gemini-3-flash-preview]
  D --> D1[grok-4.1-fast]
  D --> D2[gpt-5.5]
  E --> E1[gpt-image-2]
  E --> E2[grok-imagine-1.0]
  F --> F1[gpt-image-2]
  G --> G1[claude-sonnet-4-5-20250929]
  G --> G2[claude-opus-4-6]
```

## 1. 先按场景选接口

| 你的场景 | 推荐接口 | 推荐模型 | 响应重点 |
|---|---|---|---|
| 普通聊天、智能客服、文本问答 | `POST /v1/chat/completions` | `grok-4.1-fast` / `gpt-5.5` / `gemini-3-flash-preview` | `choices[0].message.content` |
| 使用 OpenAI Responses API 的客户端 | `POST /v1/responses` | `grok-4.1-fast` / `gpt-5.5` | `status=completed`、`output[].content[].text` |
| 生成图片 | `POST /v1/images/generations` | `gpt-image-2` / `grok-imagine-1.0` | OpenAI 常见 `b64_json`；Grok 常见 `url` |
| 编辑图片 | `POST /v1/images/edits` | `gpt-image-2` | `data[0].b64_json` |
| Claude 原生 Messages | `POST /v1/messages` | `claude-sonnet-4-5-20250929` / `claude-opus-4-6` | `content[].text` |

## 2. Base URL 与认证

Base URL：

```text
https://sub-lb.tap365.org
```

所有接口统一使用 Bearer Key：

```http
Authorization: Bearer <YOUR_SUBLB_API_KEY>
Accept: application/json
```

JSON 请求额外带：

```http
Content-Type: application/json
```

图片编辑使用 `multipart/form-data`，不要手写 `Content-Type` 边界，交给 curl、Postman 或 SDK 自动生成。

推荐环境变量：

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="你的 SubLB 分组 Key"
```

## 3. 分组 Key 怎么选

| 分组方向 | 适合做什么 | 推荐模型 | 常用接口 |
|---|---|---|---|
| Grok 文本 | 文本对话、Responses | `grok-4.1-fast` | `/v1/chat/completions`、`/v1/responses` |
| OpenAI 文本 | 文本对话、Responses | `gpt-5.5` | `/v1/chat/completions`、`/v1/responses` |
| OpenAI 图片 | 生图、图片编辑 | `gpt-image-2` | `/v1/images/generations`、`/v1/images/edits` |
| Grok 图片 | 生图 | `grok-imagine-1.0` | `/v1/images/generations` |
| Gemini 文本 | 文本对话 | `gemini-3-flash-preview` | `/v1/chat/completions` |
| Claude | Claude 原生 Messages | `claude-sonnet-4-5-20250929`、`claude-opus-4-6` | `/v1/messages` |

> 一个 Key 只代表一个分组的权限。比如图片分组 Key 不一定能调用文本模型，文本分组 Key 也不一定能调用图片模型。

## 4. 模型枚举 `/v1/models`

先用 `/v1/models` 看这把 Key 能枚举到哪些模型：

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

典型响应：

```json
{
  "object": "list",
  "data": [
    { "id": "grok-4.1-fast", "object": "model" }
  ]
}
```

注意：`/v1/models` 只说明“能枚举”，不等于“业务接口一定可用”。上线前请再调用对应业务接口确认。

## 5. 文本对话 `/v1/chat/completions`

适合普通聊天、智能客服、问答、第三方 OpenAI-compatible 客户端。

### Grok 文本示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "grok-4.1-fast",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_GROK_OK"}
    ]
  }'
```

### OpenAI 文本示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 OK-OPENAI"}
    ]
  }'
```

成功响应按 OpenAI Chat Completions 解析：

```json
{
  "object": "chat.completion",
  "model": "gpt-5.5",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "OK-OPENAI"
      }
    }
  ]
}
```

## 6. Responses API `/v1/responses`

适合已经按 OpenAI Responses API 接入的客户端或 Agent 工具链。

### Grok Responses 示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "grok-4.1-fast",
    "stream": false,
    "input": "只回复 SUBLB_RESPONSES_OK"
  }'
```

### OpenAI Responses 示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "input": "只回复 OK-OPENAI-RESPONSES"
  }'
```

成功响应重点看：

```json
{
  "object": "response",
  "status": "completed",
  "model": "gpt-5.5",
  "output": [
    {
      "content": [
        { "type": "output_text", "text": "OK-OPENAI-RESPONSES" }
      ]
    }
  ]
}
```

## 7. 生图 `/v1/images/generations`

OpenAI 图片分组推荐 `gpt-image-2`；Grok 图片分组推荐 `grok-imagine-1.0`。

### OpenAI 生图示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/generations" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "White background, simple blue letter O icon",
    "size": "1024x1024",
    "n": 1
  }'
```

OpenAI 图片常见返回：

```json
{
  "created": 1777522196,
  "data": [
    {
      "b64_json": "...",
      "revised_prompt": "..."
    }
  ]
}
```

### Grok 生图示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/generations" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "grok-imagine-1.0",
    "prompt": "White background, simple black letter G icon",
    "size": "1024x1024",
    "n": 1
  }'
```

Grok 图片常见返回：

```json
{
  "created": 1777522176,
  "data": [
    { "url": "https://.../image.jpg" }
  ]
}
```

接入方建议同时兼容 `data[0].b64_json` 和 `data[0].url`。

## 8. 图片编辑 `/v1/images/edits`

图片编辑使用 OpenAI 风格 multipart/form-data。OpenAI 图片分组使用 `gpt-image-2`。

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/edits" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json" \
  -F "model=gpt-image-2" \
  -F "prompt=把这张图改成更亮一点的蓝色风格" \
  -F "image=@./source.png" \
  -F "size=1024x1024" \
  -F "response_format=b64_json"
```

如果需要局部编辑，可增加遮罩：

```bash
-F "mask=@./mask.png"
```

成功响应通常按图片生成接口同样解析：

```json
{
  "data": [
    { "b64_json": "..." }
  ]
}
```

## 9. Claude 原生 Messages `/v1/messages`

Claude 推荐使用原生 Messages 入口，而不是把 Claude 强行当成 Chat Completions。

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "claude-sonnet-4-5-20250929",
    "max_tokens": 64,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_CLAUDE_OK"}
    ]
  }'
```

成功响应重点看 `content[].text`：

```json
{
  "type": "message",
  "model": "claude-sonnet-4-5-20250929",
  "content": [
    { "type": "text", "text": "SUBLB_CLAUDE_OK" }
  ]
}
```

## 10. Gemini 文本 `/v1/chat/completions`

Gemini 文本分组走 OpenAI-compatible Chat Completions。

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gemini-3-flash-preview",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_GEMINI_TEXT_OK"}
    ]
  }'
```

解析方式与普通 Chat Completions 一致，读取 `choices[0].message.content`。

## 11. 错误响应与错误码

SubLB 对外接口优先按 OpenAI-compatible 错误对象返回。客户端不要只按 HTTP 状态码判断，也要读取 `error.code`、`error.type` 和 `error.message`。

标准错误响应：

```json
{
  "error": {
    "message": "no available accounts supporting model",
    "type": "invalid_request_error",
    "param": "model",
    "code": "model_not_available"
  }
}
```

常见错误码：

| HTTP | `error.type` | `error.code` | 含义 | 处理建议 |
|---:|---|---|---|---|
| 400 | `invalid_request_error` | `invalid_request` | 请求体格式错误、字段缺失或参数不合法 | 检查 JSON / multipart 字段 |
| 400 | `invalid_request_error` | `unsupported_model` | 模型名不被该接口或分组支持 | 先查 `/v1/models`，再跑业务接口 |
| 401 | `authentication_error` | `invalid_api_key` | Key 缺失、格式错误或无效 | 检查 `Authorization: Bearer ...` |
| 403 | `permission_error` | `insufficient_permissions` | Key 有效，但没有目标分组或模型权限 | 换对应分组 Key |
| 404 | `invalid_request_error` | `not_found` | 路径不存在或资源不存在 | 检查接口路径，例如 `/v1/responses` 不要写成 `/v1/response` |
| 429 | `rate_limit_error` | `rate_limit_exceeded` | 触发限流或上游账号额度限制 | 降低并发，稍后重试 |
| 429 | `rate_limit_error` | `quota_exceeded` | 订阅额度、分组额度或上游账号额度不足 | 检查订阅额度或换可用分组 |
| 502 | `server_error` | `origin_bad_gateway` | 上游返回异常、账号不可用或反向链路失败 | 稍后重试；持续出现时联系维护方排查上游 |
| 503 | `server_error` | `no_available_channel` | 当前没有可调度账号或渠道 | 等待恢复或换分组 |
| 504 | `server_error` | `upstream_timeout` | 上游超时 | 重试或降低请求复杂度 |

排查顺序：

1. 先确认 Base URL 和 Key。
2. 再确认 Key 所在分组是否匹配目标模型。
3. 用 `/v1/models` 看模型是否可枚举。
4. 调用真实业务接口确认，例如 `/v1/chat/completions`、`/v1/responses`、`/v1/images/generations`。
5. 如果业务接口返回 502 / 503，优先按上游账号、调度、额度或临时故障处理，不要直接把它判断成模型名错误。

## 结尾：推荐接入顺序

新接入方建议按下面顺序推进：

1. 先拿一把明确用途的分组 Key，例如 OpenAI 文本、OpenAI 图片、Grok 图片或 Claude。
2. 用 `/v1/models` 做枚举确认。
3. 按你的业务场景跑一个最小请求。
4. 代码里不要写死只支持一种图片返回格式；生图同时兼容 `url` 和 `b64_json`。
5. 上线前把 Key 放到服务端环境变量，不要放到前端、README、截图或工单里。

如果你只想快速开始：文本优先用 `/v1/chat/completions`；生图优先用 `/v1/images/generations`；图片编辑用 `/v1/images/edits`；Claude 客户端用 `/v1/messages`。
