# sublb-demo

SubLB OpenAI-compatible API 的公开最小 Demo，用于演示和验收：

1. **标准 OpenAI 风格接口**：`/v1/models`、`/v1/chat/completions`、`/v1/responses`、`/v1/images/generations`、`/v1/images/edits`
2. **多 provider 接入口径**：Grok / OpenAI / Gemini / Claude
3. **非流式 JSON 聚合**：即使上游内部返回 SSE，客户端在 `stream:false` 下也应拿到标准 JSON
4. **真实接口验证**：只把业务接口实际跑通的模型写入可用清单

这个仓库**不包含任何密钥**，只保留示例代码和对外文档。

---

## 当前推荐阅读

如果你要接入 SubLB API，优先看新版完整文档：

- [sublb_grok_openai_gemini_claude_API文档.md](sublb_grok_openai_gemini_claude_API文档.md)

旧生图文档已迁移为跳转页：

- [Sublb生图对外API文档.md](Sublb生图对外API文档.md)

排障文档：

- [QA常见问题.md](QA常见问题.md)
- [第三方客户端问题汇总.md](第三方客户端问题汇总.md)

---

## Base URL

```text
https://sub-lb.tap365.org
```

认证方式：

```http
Authorization: Bearer <YOUR_SUBLB_API_KEY>
Accept: application/json
```

JSON 请求额外带：

```http
Content-Type: application/json
```

---

## 当前可用能力

测试日期：2026-04-30

文档版本：v1.3

| Provider | 模型 | 已测接口 | 结论 |
|---|---|---|---|
| Grok | `grok-4.1-fast` | `POST /v1/chat/completions` | 200，通过 |
| Grok | `grok-4.1-fast` | `POST /v1/responses` | 200，`status=completed` |
| Grok | `grok-imagine-1.0` | `POST /v1/images/generations` | 200，返回 `data[0].url` |
| OpenAI | `gpt-image-2` | `POST /v1/images/generations` | 200，返回 `data[0].b64_json` |
| Gemini | `gemini-3-flash-preview` | `POST /v1/chat/completions` | 200，返回 `SUBLB_GEMINI_TEXT_OK` |
| Claude | `claude-sonnet-4-5-20250929` | `POST /v1/messages` | 200，返回 `SUBLB_CLAUDE_OK`；Claude 原生 Messages |
| Claude | `claude-opus-4-6` | `POST /v1/messages` | 200，返回 `SUBLB_CLAUDE_OK`；Claude 原生 Messages |

> 注意：未列出的模型不在 README 的对外承诺范围内。以 API 文档和实际分组权限为准。

---

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

---

## 最小接口示例

### 1. 列出模型 `/v1/models`

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

### 2. Chat Completions `/v1/chat/completions`

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

### 3. Responses `/v1/responses`

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

### 4. 生图 `/v1/images/generations`

Grok：

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

OpenAI：

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

---

## 可复跑 Hurl 验收

仓库提供了一个最小 Hurl smoke case：

```text
tests/sublb_openai_compatible_smoke.hurl
```

运行示例：

```bash
hurl --test \
  --variable base_url="https://sub-lb.tap365.org" \
  --secret api_key="$SUBLB_API_KEY" \
  --variable text_model="grok-4.1-fast" \
  tests/sublb_openai_compatible_smoke.hurl
```

Hurl case 会验证：

- `GET /v1/models` 返回 200 且有 `data`
- `POST /v1/chat/completions` 返回 200 且内容包含 `SUBLB_HURL_OK`

---

## 目录

```text
sublb-demo/
├── .env.example
├── README.md
├── sublb_grok_openai_gemini_claude_API文档.md
├── Sublb生图对外API文档.md
├── QA常见问题.md
├── 第三方客户端问题汇总.md
├── examples/
│   ├── curl/
│   └── python/
└── tests/
    └── sublb_openai_compatible_smoke.hurl
```

---

## 这个仓库解决什么问题

这个仓库不是完整网关项目，而是公开最小示例仓库，专门解决：

```text
客户端非流式请求
└─ SubLB / 上游内部可能使用 SSE
   └─ 网关聚合后返回 OpenAI-compatible JSON
      └─ 下游 SDK / curl / 后端服务不需要自己解析 SSE
```

如果你只想拿最终结果：

- 设置 `stream:false`
- 设置 `Accept: application/json`
- 按普通 OpenAI JSON 响应解析

如果你要真正消费流式输出，再把 `stream` 设为 `true` 并使用流式客户端。

---

## 文档补充规则

新增模型时不要直接写入 README：

1. 先用真实 key 跑业务接口。
2. 成功后补充 `sublb_grok_openai_gemini_claude_API文档.md` 的“当前可用模型”。
3. 再同步更新 README 的模型表。
4. 失败模型单独写入“暂未承诺可用”，不要冒充可用。
5. 对外文档不写内部 key、账号、测试产物路径或后台详情。

## License

MIT
