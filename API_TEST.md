# SubLB API 测试文档（Postman / Apifox 风格）

这份文档只解决一件事：**拿到 SubLB API Key 后，按接口集合一步步跑通请求。**

适合：第一次用 API、第一次用 Postman / Apifox、让 AI 帮你接入的人。

---

## 小白概念解释：先看懂再测试

| 概念 | 人话解释 | 最容易错的地方 |
|---|---|---|
| Base URL | 所有接口共同的前缀，例如 `https://sub-lb.tap365.org` | 多写或漏写 `/v1` |
| API Key | 你的接口通行证，决定能用哪些模型和能力 | 以为一个 Key 能调用所有平台 |
| Model | 请求体里的 `model` 字段 | `/v1/models` 看得到，不代表业务接口一定可用 |
| OpenAI-compatible | 兼容 OpenAI 形状的接口 | 把 Claude / Gemini 全塞进同一个接口 |
| 返回字段 | 成功后真正要读取的内容位置 | 请求 200 了，但不知道读哪个字段 |

最小排错顺序：

```text
1. Base URL 是否正确
2. Header 认证是否正确
3. Key 是否属于这个分组
4. model 是否属于这个 Key
5. 接口路径是否对应平台
6. 额度是否用完
7. 上游账号是否暂不可用
```

不要一失败就同时换 Key、换模型、换接口、换代理。一次只改一个变量。

---
## 0. 环境变量

在 Postman / Apifox 里先建一个环境，填这两个变量：

| 变量名 | 示例值 | 说明 |
|---|---|---|
| `base_url` | `https://sub-lb.tap365.org` | SubLB API 地址 |
| `api_key` | `你的 SubLB API Key` | 不要写进公开文档、截图、issue |

在 curl 里可以这样设置：

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="替换成你的 SubLB API Key"
```

---

## 1. 全局认证

### 1.1 OpenAI-compatible / Claude / 图片接口

大多数接口使用 Bearer Token：

```http
Authorization: Bearer {{api_key}}
Content-Type: application/json
Accept: application/json
```

### 1.2 Gemini 原生接口

Gemini 原生接口使用 Google 风格 Header：

```http
x-goog-api-key: {{api_key}}
Content-Type: application/json
Accept: application/json
```

---

## 2. 建议测试顺序

小白按这个顺序跑，不要一开始就测所有模型：

```text
1. GET /v1/models
   ↓ 看 Key 能看到哪些模型
2. POST /v1/chat/completions
   ↓ 跑通最常见文本接口
3. POST /v1/responses
   ↓ 如果客户端用 Responses，再测这个
4. POST /v1/messages
   ↓ 只有 Claude Key 才测
5. POST /v1/images/generations
   ↓ 只有图片 Key 才测
6. POST /v1beta/models/{model}:generateContent
   ↓ 只有 Gemini Key 才测
```

`/v1/models` 只代表“看得到模型”，不代表业务接口一定可用。最终以对应业务接口返回 200 为准。

---

## 3. 接口目录

| 分组 | 方法 | 路径 | 用途 |
|---|---:|---|---|
| 模型 | GET | `/v1/models` | 查看当前 Key 可见模型 |
| 文本 | POST | `/v1/chat/completions` | OpenAI / DeepSeek / Grok 文本对话 |
| 文本 | POST | `/v1/responses` | OpenAI-style Responses 接口 |
| Claude | POST | `/v1/messages` | Claude Messages 接口 |
| 图片 | POST | `/v1/images/generations` | OpenAI / Grok 图片生成 |
| 图片 | POST | `/v1/images/edits` | 图片编辑 / 遮罩编辑 |
| Gemini | POST | `/v1beta/models/{model}:generateContent` | Gemini 原生文本 / 图片接口 |

---

## 4. 模型列表

### GET `/v1/models`

用途：确认这个 Key 当前能看到哪些模型。

#### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

Postman / Apifox：

```text
GET {{base_url}}/v1/models
Authorization: Bearer {{api_key}}
```

#### 成功判断

- HTTP 状态码：`200`
- 响应里有 `data` 数组

#### 读取字段

| 字段 | 说明 |
|---|---|
| `data[].id` | 模型名，后续请求里的 `model` 就填这个 |
| `data[].object` | 一般是 `model` |

#### 注意

看到模型不等于一定能跑通。比如图片模型还要走图片接口，Claude 要走 `/v1/messages`，Gemini 原生接口要走 `/v1beta/models/{model}:generateContent`。

---

## 5. 文本对话：Chat Completions

### POST `/v1/chat/completions`

用途：OpenAI / DeepSeek / Grok 文本对话。小白优先测这个。

#### 常用模型

| Key 类型 | 建议先填 |
|---|---|
| OpenAI / GPT / Codex | `gpt-5.5` |
| DeepSeek | `deepseek-v4-flash` 或 `deepseek-v4-pro` |
| Grok 文本 | `grok-4.1-fast` |

#### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_OK"}
    ],
    "max_tokens": 32
  }'
```

Postman / Apifox：

```text
POST {{base_url}}/v1/chat/completions
Authorization: Bearer {{api_key}}
Content-Type: application/json
```

Body：

```json
{
  "model": "gpt-5.5",
  "stream": false,
  "messages": [
    {"role": "user", "content": "只回复 SUBLB_OK"}
  ],
  "max_tokens": 32
}
```

#### 成功判断

- HTTP 状态码：`200`
- `choices[0].message.content` 有文本
- 示例应返回类似 `SUBLB_OK`

#### 读取字段

```text
choices[0].message.content
```

---

## 6. 文本生成：Responses

### POST `/v1/responses`

用途：给使用 OpenAI Responses 风格的客户端或 SDK 测试。

#### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "input": "只回复 SUBLB_RESPONSES_OK",
    "max_output_tokens": 32
  }'
```

Body：

```json
{
  "model": "gpt-5.5",
  "stream": false,
  "input": "只回复 SUBLB_RESPONSES_OK",
  "max_output_tokens": 32
}
```

#### 成功判断

- HTTP 状态码：`200`
- `output_text` 有文本，或可以从 `output[].content[].text` 取到文本

#### 读取字段

```text
output_text
output[].content[].text
```

---

## 7. Claude：Messages

### POST `/v1/messages`

用途：Claude Key 测试。Claude 不建议用 `/v1/chat/completions` 当默认入口。

#### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "claude-fable-5",
    "max_tokens": 64,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_CLAUDE_OK"}
    ]
  }'
```

Body：

```json
{
  "model": "claude-fable-5",
  "max_tokens": 64,
  "messages": [
    {"role": "user", "content": "只回复 SUBLB_CLAUDE_OK"}
  ]
}
```

#### 成功判断

- HTTP 状态码：`200`
- `content[].text` 有文本

#### 读取字段

```text
content[].text
```

---

## 8. 图片生成

### POST `/v1/images/generations`

用途：OpenAI / Grok 图片生成。

#### 常用模型

| 图片类型 | 建议先填 |
|---|---|
| OpenAI 图片 | `gpt-image-2` |
| Grok 图片 | `grok-imagine-1.0` |

#### 请求

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

Body：

```json
{
  "model": "gpt-image-2",
  "prompt": "White background, simple blue letter O icon",
  "size": "1024x1024",
  "n": 1
}
```

#### 成功判断

- HTTP 状态码：`200`
- `data[0].url` 或 `data[0].b64_json` 存在

#### 读取字段

| Provider | 常见返回字段 |
|---|---|
| OpenAI 图片 | `data[0].b64_json` |
| Grok 图片 | `data[0].url` |

更完整字段和边界看根目录 `API_REFERENCE.md`。

---

## 9. 图片编辑

### POST `/v1/images/edits`

用途：图片编辑、局部重绘、遮罩编辑。这个接口通常需要 `multipart/form-data`。

#### 请求示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/edits" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -F 'model=gpt-image-2' \
  -F 'prompt=把图片背景改成干净的白色' \
  -F 'image=@input.png'
```

#### 成功判断

- HTTP 状态码：`200`
- `data[0].url` 或 `data[0].b64_json` 存在

---

## 10. Gemini 原生 generateContent

### POST `/v1beta/models/{model}:generateContent`

用途：Gemini 原生接口。注意它不是 OpenAI-compatible 写法。

#### 请求

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1beta/models/gemini-3-flash-preview:generateContent" \
  -H "x-goog-api-key: $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "只回复 SUBLB_GEMINI_OK"}]}
    ],
    "generationConfig": {"maxOutputTokens": 32, "temperature": 0}
  }'
```

Body：

```json
{
  "contents": [
    {"role": "user", "parts": [{"text": "只回复 SUBLB_GEMINI_OK"}]}
  ],
  "generationConfig": {"maxOutputTokens": 32, "temperature": 0}
}
```

#### 成功判断

- HTTP 状态码：`200`
- `candidates[0].content.parts[].text` 有文本

#### 读取字段

```text
candidates[0].content.parts[].text
```

---

## 11. 常见错误排查

| 状态 / 现象 | 优先检查 |
|---|---|
| `401 Unauthorized` | Key 是否完整；Header 是否是 `Authorization: Bearer {{api_key}}` |
| `403 ACCESS_DENIED` | 当前分组没有这个模型或接口权限 |
| `404` | 路径是否写错；Claude 是 `/v1/messages`；Gemini 路径含 `:generateContent` |
| `405` | Base URL 或路径是否多拼/少拼 `/v1` |
| `429` / limit | 日限额、月限额、分组额度是否用完 |
| `502` / `503` | 上游账号暂不可用，换模型/分组或联系平台处理 |
| `/v1/models` 有模型但业务接口失败 | 模型可见不等于业务接口可用；用对应接口重新测 |
| 返回了 JSON 但不知道读哪里 | 看每个接口的“读取字段” |

---

## 12. Postman / Apifox 断言建议

可以给每个接口加最小断言：

| 接口 | 断言 |
|---|---|
| `GET /v1/models` | 状态码是 200；`data` 是数组 |
| `POST /v1/chat/completions` | 状态码是 200；`choices[0].message.content` 存在 |
| `POST /v1/responses` | 状态码是 200；`output_text` 或 `output[].content[].text` 存在 |
| `POST /v1/messages` | 状态码是 200；`content[].text` 存在 |
| `POST /v1/images/generations` | 状态码是 200；`data[0].url` 或 `data[0].b64_json` 存在 |
| `POST /v1beta/models/{model}:generateContent` | 状态码是 200；`candidates[0].content.parts[].text` 存在 |

