# sublb-demo

SubLB API 的公开 Demo 仓库，用一套 Base URL 演示 Grok、OpenAI、Gemini、Claude 的常用接入方式。

这个仓库解决一个很具体的问题：接入方拿到 SubLB 分组 Key 后，应该调用哪个接口、填哪个模型、按什么字段解析响应。

- Base URL：`https://sub-lb.tap365.org`
- 认证：`Authorization: Bearer <YOUR_SUBLB_API_KEY>`
- 完整文档：[sublb_grok_openai_gemini_claude_API文档.md](sublb_grok_openai_gemini_claude_API文档.md)
- `gpt-image-2` 生图、修图、遮罩编辑专项：[gpt-image-2使用指南.md](gpt-image-2使用指南.md)

## 一张图看懂

```mermaid
flowchart TD
  A[选择 SubLB 分组 Key] --> B{业务场景}
  B -->|文本对话| C["/v1/chat/completions"]
  B -->|Responses 客户端| D["/v1/responses"]
  B -->|生图| E["/v1/images/generations"]
  B -->|图片编辑| F["/v1/images/edits"]
  B -->|Claude 原生| G["/v1/messages"]
  B -->|Gemini 原生文本/图片| H["/v1beta/models/{model}:generateContent"]

  C --> C1[grok-4.1-fast / gpt-5.5]
  D --> D1[grok-4.1-fast / gpt-5.5]
  E --> E1[gpt-image-2 / grok-imagine-1.0]
  F --> F1[gpt-image-2]
  G --> G1[claude-sonnet-4-5-20250929 / claude-opus-4-6]
  H --> H1[gemini-3.1-pro-preview / gemini-3-flash-preview]
  H --> H2[gemini-3-pro-image / gemini-3.1-flash-image-preview / gemini-3.1-flash-image]
```

## 快速开始

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
SUBLB_BASE_URL="https://sub-lb.tap365.org"
SUBLB_API_KEY="your_api_key_here"
SUBLB_MODEL="grok-4.1-fast"
```

导入环境变量：

```bash
set -a
source .env
set +a
```

不要把真实密钥提交到 GitHub。

## 当前接入口径

测试日期：2026-05-01

文档版本：v1.8

| 场景 | Provider | 推荐模型 | 推荐接口 | 响应重点 |
|---|---|---|---|---|
| 文本对话 | Grok | `grok-4.1-fast` | `POST /v1/chat/completions` | `choices[0].message.content` |
| Responses | Grok | `grok-4.1-fast` | `POST /v1/responses` | `status=completed` |
| 文本对话 | OpenAI | `gpt-5.5` | `POST /v1/chat/completions` | `choices[0].message.content` |
| Responses | OpenAI | `gpt-5.5` | `POST /v1/responses` | `status=completed` |
| 生图 | OpenAI | `gpt-image-2` | `POST /v1/images/generations` | `data[0].b64_json` |
| 图片编辑 | OpenAI | `gpt-image-2` | `POST /v1/images/edits` | `data[0].b64_json` |
| 生图 | Grok | `grok-imagine-1.0` | `POST /v1/images/generations` | `data[0].url` |
| Gemini 原生文本 | Gemini | `gemini-3.1-pro-preview` / `gemini-3-flash-preview` | `POST /v1beta/models/{model}:generateContent` | `candidates[0].content.parts[].text` |
| Gemini 原生图片 | Gemini | `gemini-3-pro-image` / `gemini-3.1-flash-image-preview` / `gemini-3.1-flash-image` | `POST /v1beta/models/{model}:generateContent` | `candidates[0].content.parts[].inlineData.data` |
| Claude 原生 | Claude | `claude-sonnet-4-5-20250929` | `POST /v1/messages` | `content[].text` |
| Claude 原生 | Claude | `claude-opus-4-6` | `POST /v1/messages` | `content[].text` |

未列出的模型不在 README 的推荐范围内。实际可用能力以你的分组 Key 和业务接口调用结果为准。

> Gemini 当前按 Google 原生 `/v1beta/models/{model}:generateContent` 接入。未列出的 Gemini 模型不在当前推荐范围内。

## 各平台模型与核心使用

| 平台 | 推荐模型 | 核心能力 | 怎么用 |
|---|---|---|---|
| OpenAI | `gpt-5.5` | 文本对话、Responses | 用 OpenAI-compatible 的 `/v1/chat/completions` 或 `/v1/responses`，按文本字段解析。 |
| OpenAI | `gpt-image-2` | 生图、图片编辑 | 生图走 `/v1/images/generations`；编辑走 `/v1/images/edits`；图片通常读取 `data[0].b64_json`。 |
| Grok | `grok-4.1-fast` | 文本对话、Responses | 用 `/v1/chat/completions` 或 `/v1/responses`，适合快速文本问答。 |
| Grok | `grok-imagine-1.0` | 生图 | 用 `/v1/images/generations`，图片通常读取 `data[0].url`。 |
| Gemini | `gemini-3.1-pro-preview` | 原生文本 | 用 `/v1beta/models/{model}:generateContent`，适合 Gemini 原生文本生成。 |
| Gemini | `gemini-3-flash-preview` | 原生文本 | 用 `/v1beta/models/{model}:generateContent`，适合更快的 Gemini 文本生成。 |
| Gemini | `gemini-3-pro-image` | 原生生图 | 用 `/v1beta/models/{model}:generateContent`，图片读取 `inlineData.data`。 |
| Gemini | `gemini-3.1-flash-image-preview` | 原生生图 | 用 `/v1beta/models/{model}:generateContent`，适合 Gemini Flash 图片生成。 |
| Gemini | `gemini-3.1-flash-image` | 原生生图 | 用 `/v1beta/models/{model}:generateContent`，图片读取 base64 `inlineData.data`。 |
| Claude | `claude-sonnet-4-5-20250929` | 原生 Messages 文本 | 用 `/v1/messages`，按 Anthropic Messages 的 `content[].text` 解析。 |
| Claude | `claude-opus-4-6` | 原生 Messages 文本 | 用 `/v1/messages`，适合高质量文本对话。 |

## 最小 curl 示例

### 1. 列出模型

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

### 2. 文本对话

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 OK"}
    ]
  }'
```

### 3. Responses

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "input": "只回复 OK"
  }'
```

### 4. 生图

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


### 5. Gemini 原生文本

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1beta/models/gemini-3-flash-preview:generateContent" \
  -H "x-goog-api-key: $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "只回复 OK"}]}
    ],
    "generationConfig": {"maxOutputTokens": 32, "temperature": 0}
  }'
```

可替换文本模型：`gemini-3.1-pro-preview`、`gemini-3-flash-preview`。

### 6. Gemini 原生图片

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1beta/models/gemini-3.1-flash-image:generateContent" \
  -H "x-goog-api-key: $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "contents": [
      {"role": "user", "parts": [{"text": "White background, small green leaf icon, clean vector style"}]}
    ],
    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
  }'
```

可替换图片模型：`gemini-3-pro-image`、`gemini-3.1-flash-image-preview`、`gemini-3.1-flash-image`。图片内容读取 `candidates[0].content.parts[].inlineData.data`，通常为 base64 图片数据。

### 7. 图片编辑

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

## 目录

```text
sublb-demo/
├── .env.example
├── README.md
├── sublb_grok_openai_gemini_claude_API文档.md
├── gpt-image-2使用指南.md
├── Sublb生图对外API文档.md
├── QA常见问题.md
├── 第三方客户端问题汇总.md
├── examples/
│   ├── curl/
│   └── python/
└── tests/
    └── sublb_openai_compatible_smoke.hurl
```

## 文档补充规则

1. 新模型先跑真实业务接口，再写进推荐清单。
2. `/v1/models` 可枚举不等于业务接口可用。
3. 对外文档不写内部 Key、账号、测试产物路径或后台详情。
4. 生图客户端同时兼容 `data[0].url` 和 `data[0].b64_json`。
5. Gemini 当前优先按 Google 原生 `/v1beta` 文档接入；未列出的 Gemini 模型不在当前推荐范围内。

## License

MIT
