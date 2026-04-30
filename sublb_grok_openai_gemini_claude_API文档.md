# SubLB Grok / OpenAI / Gemini / Claude OpenAI-compatible API 文档

测试日期：2026-04-30

文档版本：v1.3

> 本文档是原 `Sublb生图对外API文档.md` 的升级版：从“只写生图”升级为 OpenAI-compatible 多 provider API 接入口径。
>
> 可用模型只按**当前真实业务接口调用成功**写入；`/v1/models` 能枚举到不等于业务接口已可用。

---

## 接入说明

本文档面向接入方，说明 SubLB OpenAI-compatible API 的 Base URL、认证方式、常用接口、请求示例与响应格式。

当前对外推荐优先使用文档中明确列出的模型；未列出的模型不在本文档承诺范围内。

---

## 1. Base URL 与认证

### 1.1 Base URL

```text
https://sub-lb.tap365.org
```

### 1.2 认证方式

所有 OpenAI-compatible 接口统一使用 Bearer Key：

```http
Authorization: Bearer <YOUR_SUBLB_API_KEY>
Accept: application/json
```

JSON 请求额外带：

```http
Content-Type: application/json
```

图片编辑这类文件上传请求使用 `multipart/form-data`，不要手写 `Content-Type` 边界，交给 curl / SDK 自动生成。

### 1.3 环境变量建议

```bash
SUBLB_BASE_URL="https://sub-lb.tap365.org"
SUBLB_API_KEY="你的 SubLB key"
SUBLB_MODEL="grok-4.1-fast"
```

不要把真实 key 写入仓库、README、工单或截图。

---

## 2. OpenAI-compatible 接口总览

| 能力 | 路径 | 请求格式 | 当前状态 |
|---|---|---|---|
| 模型枚举 | `GET /v1/models` | 无 body | 已测，200 |
| Chat Completions | `POST /v1/chat/completions` | JSON | Grok 已测，200 |
| Responses | `POST /v1/responses` | JSON | Grok 已测，200 |
| Claude Messages | `POST /v1/messages` | JSON | Claude 原生已测，200；非 OpenAI-compatible |
| 生图 | `POST /v1/images/generations` | JSON | Grok / OpenAI 已测，200 |
| 图片编辑 | `POST /v1/images/edits` | multipart/form-data | 接入口径保留；当前未复测 |
| 视频 | `POST /v1/videos` 或 provider 私有路径 | 视实现而定 | 当前未纳入可用清单 |

---

## 3. `/v1/models`

### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

### 成功响应形态

```json
{
  "object": "list",
  "data": [
    { "id": "grok-4.1-fast", "object": "model" }
  ]
}
```

### 注意

- `/v1/models` 只代表这把 key 所在分组能枚举到哪些模型。
- 真正可对外承诺，必须再跑对应业务接口，例如 `/v1/chat/completions`、`/v1/responses`、`/v1/images/generations`。
- 当前 `grok-imagine-1.0-fast` 可以在 Grok 图片 key 的 `/v1/models` 中看到，但业务生图返回 502，因此不写入“已可用模型”。

---

## 4. `/v1/chat/completions`

### 请求示例：Grok 文本

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

### 成功响应关键字段

```json
{
  "id": "resp_xxx",
  "object": "chat.completion",
  "model": "grok-4.1-fast",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "SUBLB_GROK_OK"
      }
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

验证结果：

| 模型 | 路径 | HTTP | 耗时 | 关键结果 |
|---|---|---:|---:|---|
| `grok-4.1-fast` | `/v1/chat/completions` | 200 | 4.263s | 返回 `SUBLB_GROK_OK` |

> 当前 Grok 文本响应里 `usage` 字段存在，但当前返回 token 值为 0。若要用于精确计费，需要继续推动上游稳定返回标准 usage，或由 SubLB 侧做 token 估算 / 后补。

---

## 5. `/v1/responses`

### 请求示例：Grok 文本

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

### 成功响应关键字段

```json
{
  "id": "resp_xxx",
  "object": "response",
  "status": "completed",
  "model": "grok-4.1-fast",
  "output": [],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```

验证结果：

| 模型 | 路径 | HTTP | 耗时 | 关键结果 |
|---|---|---:|---:|---|
| `grok-4.1-fast` | `/v1/responses` | 200 | 4.144s | `status=completed` |

---

## 6. Claude 原生 `/v1/messages`

Claude 分组除 OpenAI-compatible Chat 外，额外验证了 Anthropic 原生 Messages 入口。该入口不是 OpenAI-compatible Chat，但可作为 Claude 接入方的真实业务接口。

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

验证结果：

| 模型 | 路径 | HTTP | 耗时 | 关键结果 |
|---|---|---:|---:|---|
| `claude-sonnet-4-5-20250929` | `/v1/messages` | 200 | 3.159s | 返回 `SUBLB_CLAUDE_OK` |
| `claude-opus-4-6` | `/v1/messages` | 200 | 3.242s | 返回 `SUBLB_CLAUDE_OK` |
| `claude-opus-4-7` | `/v1/messages` | 0 | 45.008s / 45.002s | 客户端超时；未写入可用 |

同时确认：`/anthropic/v1/messages` 当前返回 405，不作为对外推荐路径。

---

## 7. `/v1/images/generations`

### 请求示例：Grok 生图

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

### 请求示例：OpenAI 生图

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

### 成功响应形态

Grok 当前常见返回 URL：

```json
{
  "created": 1777522176,
  "data": [
    { "url": "https://.../image.jpg" }
  ],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  }
}
```

OpenAI 当前常见返回 base64：

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

接入方应同时兼容：

- `data[0].url`
- `data[0].b64_json`

验证结果：

| Provider | 模型 | 路径 | HTTP | 耗时 | 响应重点 |
|---|---|---|---:|---:|---|
| Grok | `grok-imagine-1.0` | `/v1/images/generations` | 200 | 4.667s | `data[0].url` |
| OpenAI | `gpt-image-2` | `/v1/images/generations` | 200 | 20.694s | `data[0].b64_json` |

---

## 8. `/v1/images/edits`

`/v1/images/edits` 使用 OpenAI 风格 multipart 请求。

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/edits" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json" \
  -F "model=gpt-image-2" \
  -F "prompt=把这张图改成更亮一点的蓝色风格" \
  -F "image=@./source.png" \
  -F "mask=@./mask.png" \
  -F "size=1024x1024" \
  -F "quality=high" \
  -F "response_format=b64_json"
```

如果没有遮罩，去掉 `mask` 字段。

当前未复测图片编辑接口，因此本节只作为接入口径，不列入“当前可用模型”。

---

## 9. Provider / 分组 / 模型映射

| Provider | 分组 / key 口径 | 模型 | 当前业务状态 | 说明 |
|---|---|---|---|---|
| Grok | Grok 文本 / 图文分组 | `grok-4.1-fast` | 可用 | `/v1/chat/completions`、`/v1/responses` 已测 200 |
| Grok | Grok 图片分组 | `grok-imagine-1.0` | 可用 | `/v1/images/generations` 已测 200 |
| OpenAI | OpenAI 图片分组 | `gpt-image-2` | 可用 | `/v1/images/generations` 已测 200 |
| Gemini | Gemini 文本分组 | `gemini-3-flash-preview` | 可用 | `/v1/chat/completions` 已测 200，返回 `SUBLB_GEMINI_TEXT_OK` |
| Claude | Claude 分组 | `claude-sonnet-4-5-20250929`, `claude-opus-4-6` | 原生 `/v1/messages` 可用 | Claude 原生 Messages，不是 OpenAI-compatible Chat |

---

## 10. 当前已实测可用模型

| 模型 | Provider | 支持接口 | 当前验收结论 |
|---|---|---|---|
| `grok-4.1-fast` | Grok | `/v1/chat/completions`, `/v1/responses` | 200，通过 |
| `grok-imagine-1.0` | Grok | `/v1/images/generations` | 200，通过 |
| `gpt-image-2` | OpenAI | `/v1/images/generations` | 200，通过 |
| `gemini-3-flash-preview` | Gemini | `/v1/chat/completions` | 200，通过；返回 `SUBLB_GEMINI_TEXT_OK` |
| `claude-sonnet-4-5-20250929` | Claude | `/v1/messages` | 200，通过；Claude 原生 Messages，不是 OpenAI-compatible Chat |
| `claude-opus-4-6` | Claude | `/v1/messages` | 200，通过；Claude 原生 Messages，不是 OpenAI-compatible Chat |

---

## 11. 错误响应与错误码

SubLB 对外接口优先按 OpenAI-compatible 错误对象返回。客户端不要只按 HTTP 状态码判断，也要读取 `error.code`、`error.type` 和 `error.message`。

### 11.1 标准错误响应格式

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

字段说明：

- `error.message`：可读错误描述，用于日志和排障。
- `error.type`：错误类型，兼容 OpenAI 风格，例如 `invalid_request_error`、`authentication_error`、`rate_limit_error`、`server_error`。
- `error.param`：可选，指向出错参数，例如 `model`、`messages`、`input`。
- `error.code`：稳定错误码，客户端应优先用于程序判断。

> 若历史链路返回纯文本 `error code: 502`，应视为旧格式或网关兜底错误；新接入方应按上面的 JSON 错误对象做解析兼容。

### 11.2 常见错误码

| HTTP | `error.type` | `error.code` | 含义 | 处理建议 |
|---:|---|---|---|---|
| 400 | `invalid_request_error` | `invalid_request` | 请求体格式错误、字段缺失或参数不合法 | 检查 JSON / multipart 字段 |
| 400 | `invalid_request_error` | `unsupported_model` | 模型名不被该接口或分组支持 | 先查 `/v1/models`，再跑业务接口 |
| 401 | `authentication_error` | `invalid_api_key` | Key 缺失、格式错误或无效 | 检查 `Authorization: Bearer ...` |
| 403 | `permission_error` | `insufficient_permissions` | Key 有效，但没有目标分组 / 模型权限 | 换对应分组 key |
| 404 | `invalid_request_error` | `not_found` | 路径不存在或资源不存在 | 检查接口路径，如 `/v1/responses` 不要写成 `/v1/response` |
| 429 | `rate_limit_error` | `rate_limit_exceeded` | 触发限流或上游账号额度限制 | 降低并发，稍后重试 |
| 429 | `rate_limit_error` | `quota_exceeded` | 订阅额度、分组额度或上游账号额度不足 | 检查订阅额度或换可用分组 |
| 502 | `server_error` | `origin_bad_gateway` | 上游返回异常、账号不可用或反向链路失败 | 看上游账号、调度与网关日志 |
| 503 | `server_error` | `no_available_channel` | 当前没有可调度账号 / 渠道 | 等待恢复或换分组 |
| 504 | `server_error` | `upstream_timeout` | 上游超时 | 重试或降低请求复杂度 |

### 11.3 排查顺序

1. 先看 HTTP 状态码。
2. 再看 `error.code`，不要只解析 `message`。
3. 确认 key 是否属于目标分组。
4. 确认 `/v1/models` 是否枚举到目标模型。
5. 再跑真实业务接口；`/v1/models` 通过不等于业务接口可用。
6. 如果业务接口 502 / 503，优先看上游账号、调度、额度和网关日志，不要直接判定模型名错误。
7. 如果响应 `usage=0`，单独标注：业务可用不等于计费 usage 完整。
