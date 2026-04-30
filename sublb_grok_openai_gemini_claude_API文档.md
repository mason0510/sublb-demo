# SubLB Grok / OpenAI / Gemini / Claude OpenAI-compatible API 文档

测试日期：2026-04-30

文档版本：v1.0

> 本文档是原 `Sublb生图对外API文档.md` 的升级版：从“只写生图”升级为 OpenAI-compatible 多 provider API 接入口径。
>
> 可用模型只按**本轮真实业务接口调用成功**写入；`/v1/models` 能枚举到不等于业务接口已可用。

---

## 0. 当前结论

```text
SubLB OpenAI-compatible Base URL
└─ https://sub-lb.tap365.org

本轮已完成业务实测
├─ Grok 文本
│  ├─ /v1/chat/completions -> grok-4.1-fast -> 200
│  └─ /v1/responses        -> grok-4.1-fast -> 200, status=completed
├─ Grok 图片
│  └─ /v1/images/generations -> grok-imagine-1.0 -> 200, 返回 data[0].url
└─ OpenAI 图片
   └─ /v1/images/generations -> gpt-image-2 -> 200, 返回 data[0].b64_json

本轮尚未写入“可用”的模型
├─ grok-imagine-1.0-fast -> /v1/models 可见，但 /v1/images/generations 本轮返回 502
├─ Gemini -> 本轮未拿到可测试 key，未完成业务实测
└─ Claude -> 本轮未拿到可测试 key，未完成业务实测
```

本轮证据目录：

```text
test_runs/20260430_120929_sublb_grok_openai_gemini_claude_api_doc/
```

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

| 能力 | 路径 | 请求格式 | 本轮状态 |
|---|---|---|---|
| 模型枚举 | `GET /v1/models` | 无 body | 已测，200 |
| Chat Completions | `POST /v1/chat/completions` | JSON | Grok 已测，200 |
| Responses | `POST /v1/responses` | JSON | Grok 已测，200 |
| 生图 | `POST /v1/images/generations` | JSON | Grok / OpenAI 已测，200 |
| 图片编辑 | `POST /v1/images/edits` | multipart/form-data | 接入口径保留；本轮未复测 |
| 视频 | `POST /v1/videos` 或 provider 私有路径 | 视实现而定 | 本轮未纳入可用清单 |

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
- 本轮 `grok-imagine-1.0-fast` 可以在 Grok 图片 key 的 `/v1/models` 中看到，但业务生图返回 502，因此不写入“已可用模型”。

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

本轮实测：

| 模型 | 路径 | HTTP | 耗时 | 关键结果 | 证据 |
|---|---|---:|---:|---|---|
| `grok-4.1-fast` | `/v1/chat/completions` | 200 | 4.263s | 返回 `SUBLB_GROK_OK` | `grok_chat_with_image_key.*` |

> 当前 Grok 文本响应里 `usage` 字段存在，但本轮返回 token 值为 0。若要用于精确计费，需要继续推动上游稳定返回标准 usage，或由 SubLB 侧做 token 估算 / 后补。

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

本轮实测：

| 模型 | 路径 | HTTP | 耗时 | 关键结果 | 证据 |
|---|---|---:|---:|---|---|
| `grok-4.1-fast` | `/v1/responses` | 200 | 4.144s | `status=completed` | `grok_responses.*` |

---

## 6. `/v1/images/generations`

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

本轮实测：

| Provider | 模型 | 路径 | HTTP | 耗时 | 响应重点 | 证据 |
|---|---|---|---:|---:|---|---|
| Grok | `grok-imagine-1.0` | `/v1/images/generations` | 200 | 4.667s | `data[0].url` | `grok_image_generation.*` |
| OpenAI | `gpt-image-2` | `/v1/images/generations` | 200 | 20.694s | `data[0].b64_json` | `openai_image_generation.*` |

本轮未通过：

| Provider | 模型 | 路径 | HTTP | 结论 | 证据 |
|---|---|---|---:|---|---|
| Grok | `grok-imagine-1.0-fast` | `/v1/images/generations` | 502 | 模型可枚举，但本轮业务调用未通过 | `grok_image_fast_generation.*` |

---

## 7. `/v1/images/edits`

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

本轮没有复测图片编辑接口，因此本节只作为接入口径，不列入“本轮可用模型”。

---

## 8. Provider / 分组 / 模型映射

| Provider | 分组 / key 口径 | 模型 | 本轮业务状态 | 说明 |
|---|---|---|---|---|
| Grok | Grok 文本 / 图文分组 | `grok-4.1-fast` | 可用 | `/v1/chat/completions`、`/v1/responses` 已测 200 |
| Grok | Grok 图片分组 | `grok-imagine-1.0` | 可用 | `/v1/images/generations` 已测 200 |
| Grok | Grok 图片分组 | `grok-imagine-1.0-fast` | 暂不承诺 | `/v1/models` 可见，生图本轮 502 |
| OpenAI | OpenAI 图片分组 | `gpt-image-2` | 可用 | `/v1/images/generations` 已测 200 |
| Gemini | 待补本轮测试 key | 待补 | 未实测 | 不写可用 |
| Claude | 待补本轮测试 key | 待补 | 未实测 | 不写可用 |

---

## 9. 当前已实测可用模型

| 模型 | Provider | 支持接口 | 本轮验收结论 |
|---|---|---|---|
| `grok-4.1-fast` | Grok | `/v1/chat/completions`, `/v1/responses` | 200，通过 |
| `grok-imagine-1.0` | Grok | `/v1/images/generations` | 200，通过 |
| `gpt-image-2` | OpenAI | `/v1/images/generations` | 200，通过 |

---

## 10. 错误响应与排查顺序

常见错误形态：

```json
{
  "error": {
    "message": "no available accounts supporting model",
    "type": "invalid_request_error"
  }
}
```

或纯文本：

```text
error code: 502
```

排查顺序：

1. 先确认 key 是否属于目标分组。
2. 再确认 `/v1/models` 是否枚举到目标模型。
3. 再跑真实业务接口，不要只凭 `/v1/models` 下结论。
4. 如果业务接口 502，优先看上游账号、上游模型可用性、调度与网关日志，不要直接判定模型名错误。
5. 如果响应 `usage=0`，要单独标注：业务可用不等于计费 usage 完整。

---

## 11. 本轮测试证据

| 文件 | 含义 |
|---|---|
| `openai_image_models.json` / `.headers.txt` / `.meta.txt` | OpenAI 图片 key 的 `/v1/models` |
| `openai_image_generation.json` / `.headers.txt` / `.meta.txt` | `gpt-image-2` 生图业务调用 |
| `grok_image_models.json` / `.headers.txt` / `.meta.txt` | Grok 图片 key 的 `/v1/models` |
| `grok_chat_with_image_key.json` / `.headers.txt` / `.meta.txt` | `grok-4.1-fast` Chat Completions |
| `grok_responses.json` / `.headers.txt` / `.meta.txt` | `grok-4.1-fast` Responses |
| `grok_image_generation.json` / `.headers.txt` / `.meta.txt` | `grok-imagine-1.0` 生图 |
| `grok_image_fast_generation.json` / `.headers.txt` / `.meta.txt` | `grok-imagine-1.0-fast` 生图失败证据 |
| `hurl_smoke_result.txt` | `tests/sublb_openai_compatible_smoke.hurl` 可复跑验收结果，2 个请求全部成功 |

---

## 12. 后续补充规则

后续新增 Gemini / Claude / 更多 Grok / 更多 OpenAI 模型时，按同一标准补表：

1. 先保存本轮真实请求证据到 `test_runs/`。
2. 至少跑一个业务接口，不只看 `/v1/models`。
3. 成功才写入“当前已实测可用模型”。
4. 失败模型写入“本轮未通过”，保留状态码和错误摘要。
5. 文档版本递增，例如 `v1.1`、`v1.2`。
