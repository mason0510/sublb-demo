# SubLB API Reference

测试日期：2026-06-10

文档版本：v4.1

本文档按 SubLB 后台真实“分组 Key”写，不按抽象 Provider 写。你拿到的 Key 属于哪个分组，决定你能调用哪个接口、能填哪个模型、按什么方式计费。

Base URL：

```text
https://sub-lb.tap365.org
```

---

## 1. Start here

这一节只解决一个问题：**第一次拿到 Key，怎么最快确认它能用。**

如果你是第一次接入，不要先读后面的长表。先按下面 4 步走。

### 1.1 先准备环境变量

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="替换成你的 SubLB API Key"
```

不要把真实 Key 写进代码、README、截图或公开 issue。

### 1.2 先确认你的 Key 属于哪个分组

SubLB 的 Key 不是“全平台万能 Key”。它通常属于一个后台分组，分组决定：

- 能用哪个接口；
- 能填哪个模型；
- 额度和计费怎么算；
- 返回字段应该怎么读。

如果你不知道分组，先问发 Key 的人。不要靠猜模型名硬试。

### 1.3 复制一个最小文本请求

OpenAI / GPT / Codex / DeepSeek / Grok 文本，一般先用 OpenAI-compatible Chat Completions：

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_OK"}
    ],
    "max_tokens": 32
  }'
```

成功时读取：

```text
choices[0].message.content
```

按分组改模型：

| 分组/用途 | 先填的模型 |
|---|---|
| OpenAI / GPT / Codex | `gpt-5.5` |
| DeepSeek | `deepseek-v4-flash` 或 `deepseek-v4-pro` |
| Grok 文本 | `grok-4.1-fast` |

Claude 不走这个接口，见 [Claude Messages](#6-claude-messages)。图片不走这个接口，见 [Images](#5-images-generations--edits)。Gemini 走原生接口，见 [Gemini generateContent](#7-gemini-原生-generatecontent)。

### 1.4 按 Key 类型选接口

| 你手上的 Key | 推荐接口 | 读取字段 |
|---|---|---|
| OpenAI / GPT / Codex 文本 | `/v1/chat/completions` 或 `/v1/responses` | Chat: `choices[0].message.content`；Responses: `output_text` |
| DeepSeek 文本 | `/v1/chat/completions` 或 `/v1/responses` | 同上 |
| Grok 文本 | `/v1/chat/completions` | `choices[0].message.content` |
| Claude | `/v1/messages` | `content[].text` |
| OpenAI / Grok 图片 | `/v1/images/generations` 或 `/v1/images/edits` | `data[0].b64_json` 或 `data[0].url` |
| Gemini | `/v1beta/models/{model}:generateContent` | `candidates[0].content.parts[].text` |

### 1.5 认证方式

OpenAI-compatible、Grok、DeepSeek、Claude、图片接口使用 Bearer：

```http
Authorization: Bearer <YOUR_SUBLB_API_KEY>
Content-Type: application/json
Accept: application/json
```

Gemini 原生接口使用 Google 风格 Header：

```http
x-goog-api-key: <YOUR_SUBLB_API_KEY>
Content-Type: application/json
Accept: application/json
```

### 1.6 模型列表只当辅助检查

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

`/v1/models` 只能说明这个 Key 当前“看得到哪些模型”；真正可用仍以业务接口实测为准。

### 1.7 新手排错顺序

| 报错/现象 | 先查什么 |
|---|---|
| 401 / Unauthorized | Key 是否完整；Header 是否写成 `Authorization: Bearer ...` |
| 404 | 路径是否写错；Claude 是 `/v1/messages` |
| 405 | Base URL 或路径是否多拼/少拼 `/v1` |
| 429 / limit | 分组额度、日限额、月限额是否用完 |
| 502 / 503 | 上游账号暂不可用，换模型/分组或联系平台处理 |
| JSON 返回了但不知道看哪里 | 先看上面的“读取字段”表 |

---

## 2. Groups and keys

### 2.1 本轮业务接口通过的推荐分组

下面表格只放本轮真实业务接口 smoke 通过的分组。已去掉 `Old*` 历史分组，也不把“用户勿选/状态探针/自测”分组作为接入推荐。

| 后台分组 | 平台 | 类型 | 适合做什么 | 推荐接口 | 推荐模型 | 本轮 smoke |
|---|---|---|---|---|---|---|
| `spark` | OpenAI | 订阅 | 前台轻量入门档，GPT PRO+GPT plus | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `start` | OpenAI | 订阅 | 前台稳定入门档，GPT PRO+GPT plus | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `pro` | OpenAI | 订阅 | 前台进阶生产档，GPT PRO+GPT plus | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `ultra` | OpenAI | 订阅 | 前台旗舰稳定档，GPT PRO+GPT plus | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `Standard` | OpenAI | 订阅 / 专属 | 前台 Standard / GPT PRO+GPT plus 主力档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `GPT basic` | OpenAI | 订阅 / 专属 | 前台 gpt plus 普通入门档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `codex普通(按量付费)` | OpenAI | 按量 | OpenAI / Codex 按量普通档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `codex-pro（按量付费）` | OpenAI | 按量 | OpenAI / Codex 按量 Pro 档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | Chat、Responses 通过 |
| `DeepSeek Basic` | OpenAI-compatible | 订阅 / 专属 | DeepSeek 通用接入 | `/v1/chat/completions`、`/v1/responses` | Chat: `deepseek-v4-flash`、`deepseek-v4-pro`；Responses: `deepseek-v4-flash` | Chat 两个模型通过；Responses flash 通过 |
| `deepseek` | OpenAI-compatible | 按量 | DeepSeek 按量接入 | `/v1/responses` | `deepseek-v4-pro` | Responses pro 通过；Chat 和 flash 本轮超时，不作为推荐写法 |
| `Grok 文本和图片` | Grok | 按量 | Grok 文本、Grok 生图 | 文本：`/v1/chat/completions`；图片：`/v1/images/generations` | 文本：`grok-4.1-fast`；图片：`grok-imagine-1.0` | 文本通过；图片本轮未测，需按图片接口单独 smoke |
| `Grok-codex 文图统一月订阅20260430(普通)` | Grok | 订阅 / 专属 | Grok 文图统一普通套餐 | 文本：`/v1/chat/completions`；图片：`/v1/images/generations` | 文本：`grok-4.1-fast`；图片：`grok-imagine-1.0` | 文本通过；图片本轮未测，需按图片接口单独 smoke |
| `Grok-codex 文图统一月订阅20260430(高级)` | Grok | 订阅 / 专属 | Grok 文图统一高级套餐 | 文本：`/v1/chat/completions`；图片：`/v1/images/generations` | 文本：`grok-4.1-fast`；图片：`grok-imagine-1.0` | 文本通过；图片本轮未测，需按图片接口单独 smoke |
| `claudecode特价` | Anthropic | 按量 | Claude 原生 Messages、Claude Fable 5 | `/v1/messages`；`/v1/responses` 非流式 JSON | `claude-fable-5`、`claude-haiku-4-5-20251001`、`claude-opus-4-6/4-7/4-8`、`claude-sonnet-4-6` | Messages 非流式 6 个模型通过；`claude-fable-5` Messages stream 通过；Responses 非流式通过 |

### 2.2 后台存在，但本文不作为“可直接用”推荐的分组

| 后台分组 | 原因 |
|---|---|
| `Codex-star（内部邀请分组）` | 本轮用分组 Key 调用返回 `SUBSCRIPTION_NOT_FOUND`，不是公开接入示例。 |
| `Trial1` | 本轮用分组 Key 调用返回 `SUBSCRIPTION_NOT_FOUND`，不写成稳定示例。 |
| `super` | 本轮月额度超限，业务接口返回 `MONTHLY_LIMIT_EXCEEDED`；补额度并重新 smoke 前，不作为可用示例。 |
| `start套餐升级` | 本轮没有 active API key，无法业务实测。 |
| `DeepSeek Flash` | 本轮没有 active API key，无法业务实测。 |
| `DeepSeek Pro` | 本轮没有 active API key，无法业务实测。 |
| `DeepSeek 体验周卡` | `/v1/models` 可见，但 chat 业务请求本轮超时；补账号或修路由并重新 smoke 前，不作为可用示例。 |
| `gemini（文本和图片）` | `/v1/models` 可见，但 generateContent 返回 `503 No available Gemini accounts`；补可用 Gemini 账号前，不作为可用示例。 |
| `cc特价` | `/v1/messages` 本轮返回上游 502；修复上游访问后需重新 smoke。 |
| `open-img分组包月` | 本轮未纳入业务 smoke；图片接入请先按 `/v1/images/generations` 或 `/v1/images/edits` 单独验收。 |
| `codex优质(按量付费)` | 本轮返回 `ACCESS_DENIED`，不作为可用示例。 |
| `Old*` 系列 | 历史分组，本文不再作为接入示例。 |
| `用户勿选 / 自测 / 状态探针` 分组 | 内部测试用途，本文不写入对外接入口径。 |

---

### 2.3 OpenAI 主力订阅档可见模型

`spark`、`start`、`pro`、`ultra`、`Standard` 这批前台 `GPT PRO+GPT plus` 分组，以及 `GPT basic`，本轮 `/v1/models` 可见的是一组 OpenAI-compatible 模型。常用优先级建议：

| 用途 | 推荐优先填 |
|---|---|
| 普通文本 / 自动化 / Codex 工作流 | `gpt-5.5` |
| 更轻量任务 | `gpt-5.4-mini`、`gpt-5-mini`、`gpt-5.1-codex-mini` |
| Codex / 代码任务 | `gpt-5.3-codex`、`gpt-5.2-codex`、`gpt-5.1-codex`、`gpt-5-codex` |
| 图片 | `gpt-image-2`，但仍要看你的分组是否允许图片接口 |
| 旧客户端兼容 | `gpt-4o`、`gpt-4.1`、`o3`、`o4-mini` 等 |

本轮在 `Standard` 分组看到 61 个模型，包括：

```text
chatgpt-4o-latest, codex-auto-review,
gpt-4, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4.5-preview,
gpt-4o, gpt-4o-mini,
gpt-5, gpt-5-chat, gpt-5-codex, gpt-5-mini, gpt-5-nano, gpt-5-pro,
gpt-5.1, gpt-5.1-chat-latest, gpt-5.1-codex, gpt-5.1-codex-max, gpt-5.1-codex-mini,
gpt-5.2, gpt-5.2-chat-latest, gpt-5.2-codex, gpt-5.2-pro,
gpt-5.3, gpt-5.3-codex, gpt-5.3-codex-spark,
gpt-5.4, gpt-5.4-mini, gpt-5.4-nano,
gpt-5.5,
gpt-image-2,
o1, o1-mini, o1-preview, o1-pro,
o3, o3-mini, o3-pro,
o4-mini
```

注意：模型可见不等于所有接口都可用。例如图片模型还要走图片接口，并且要看该分组是否允许图片能力。

---

## 3. OpenAI-compatible Chat Completions

```http
POST /v1/chat/completions
```

适用于 OpenAI 文本、DeepSeek 文本、Grok 文本等 OpenAI-compatible 请求。

### Request body

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 模型名，例如 `gpt-5.5`、`deepseek-v4-flash`、`deepseek-v4-pro`、`grok-4.1-fast` |
| `messages` | array | 是 | 对话消息数组 |
| `stream` | boolean | 否 | 是否流式返回；首次测试建议 `false` |
| `max_tokens` | number | 否 | 最大输出 token 数 |

### Example request

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "deepseek-v4-flash",
    "stream": false,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_OK"}
    ],
    "max_tokens": 32
  }'
```

### Example response

```json
{
  "object": "chat.completion",
  "model": "deepseek-v4-flash",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "SUBLB_OK"
      },
      "finish_reason": "stop"
    }
  ]
}
```

读取字段：`choices[0].message.content`。

### 模型怎么填

| 你手上的分组 Key | 推荐模型 |
|---|---|
| `spark` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `start` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `pro` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `ultra` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `Standard` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `GPT basic` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `codex普通(按量付费)` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `codex-pro（按量付费）` | `gpt-5.5`；也可按 `/v1/models` 选择 GPT/Codex 系列 |
| `DeepSeek Basic` | `deepseek-v4-flash`、`deepseek-v4-pro` |
| `deepseek` | 本轮 Chat Completions 超时；如使用该分组，优先走 `/v1/responses` + `deepseek-v4-pro` |
| `Grok 文本和图片` | `grok-4.1-fast` |
| `Grok-codex 文图统一月订阅20260430(普通)` | `grok-4.1-fast` |
| `Grok-codex 文图统一月订阅20260430(高级)` | `grok-4.1-fast` |

---

## 4. OpenAI Responses

```http
POST /v1/responses
```

适合已经使用 OpenAI Responses API 的 SDK、Agent 框架或客户端。

### Request body

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 模型名 |
| `input` | string / array | 是 | 输入内容 |
| `stream` | boolean | 否 | 是否流式返回；首次测试建议 `false` |
| `max_output_tokens` | number | 否 | 最大输出 token 数 |

### Example request

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/responses" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "deepseek-v4-flash",
    "stream": false,
    "input": "只回复 SUBLB_RESPONSES_OK",
    "max_output_tokens": 32
  }'
```

### Example response

```json
{
  "object": "response",
  "status": "completed",
  "model": "deepseek-v4-flash",
  "output": [
    {
      "type": "message",
      "content": [
        {"type": "output_text", "text": "SUBLB_RESPONSES_OK"}
      ]
    }
  ]
}
```

读取字段：优先读 `output_text`；没有时读 `output[].content[].text`。

### 本轮 DeepSeek Responses 实测

| 分组 | 模型 | 结果 |
|---|---|---|
| `DeepSeek Basic` | `deepseek-v4-flash` | 200，通过 |
| `DeepSeek Basic` | `deepseek-v4-pro` | 本轮超时，建议优先用 Chat Completions |
| `deepseek` | `deepseek-v4-pro` | 200，通过 |
| `deepseek` | `deepseek-v4-flash` | 本轮超时 |

---

## 5. Images

### 5.1 Create image

注意：本轮 smoke 重点覆盖文本、Responses、Claude Messages 和 Gemini generateContent；图片接口没有纳入本轮统一 smoke。图片分组接入前必须用下面的最小请求单独验收。

```http
POST /v1/images/generations
```

| 分组 | 模型 | 说明 |
|---|---|---|
| `open-img分组包月` | `gpt-image-2` | OpenAI 图片生成 |
| `Grok 文本和图片` | `grok-imagine-1.0` | Grok 图片生成 |
| `Grok-codex 文图统一月订阅20260430(普通)` | `grok-imagine-1.0` | Grok 图片生成 |
| `Grok-codex 文图统一月订阅20260430(高级)` | `grok-imagine-1.0` | Grok 图片生成 |

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

OpenAI 图片通常读取 `data[0].b64_json`；Grok 图片通常读取 `data[0].url`。

### 5.2 Edit image

```http
POST /v1/images/edits
```

适用于 `gpt-image-2` 图片编辑。

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

---

## 6. Claude Messages

```http
POST /v1/messages
```

适用于 Anthropic Claude 原生 Messages 格式。

### Request body

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 例如 `claude-fable-5` |
| `messages` | array | 是 | Anthropic Messages 数组 |
| `max_tokens` | number | 是 | 最大输出 token 数 |

### Example request

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

### Example response

```json
{
  "type": "message",
  "role": "assistant",
  "model": "claude-fable-5",
  "content": [
    {"type": "text", "text": "SUBLB_CLAUDE_OK"}
  ],
  "stop_reason": "end_turn"
}
```

读取字段：`content[].text`。

本轮实测：`claudecode特价` 重点模型均通过 Anthropic 原生 `/v1/messages` 非流式业务验收；`claude-fable-5` 另通过 `/v1/messages` 流式和 `/v1/responses` 非流式 JSON 验收。`cc特价` 的 `/v1/messages` 返回上游 502，暂不作为 Messages 稳定示例。

### 6.1 Claude Fable 5 与 Claude 4.x 模型

本轮 Claude 口径以 Anthropic 原生 `/v1/messages` 为主，不把 `/v1/chat/completions` 作为默认 Claude 接入口径。

| 模型 | `/v1/messages` 非流式 | 备注 |
|---|---|---|
| `claude-fable-5` | 200，返回 `pong` | 支持 `/v1/messages` stream；支持 `/v1/responses` 非流式 JSON |
| `claude-haiku-4-5-20251001` | 200，返回 `pong` | - |
| `claude-opus-4-6` | 200，返回 `pong` | - |
| `claude-opus-4-7` | 200，返回 `pong` | - |
| `claude-opus-4-8` | 200，返回 `pong` | - |
| `claude-sonnet-4-6` | 200，返回 `pong` | - |

接口边界：

- `/v1/messages`：支持非流式；`claude-fable-5` 流式实测 200，返回 `message_start`、`content_block_delta`、`message_stop` 等标准 SSE 事件。
- `/v1/responses`：`claude-fable-5` 支持非流式 JSON，实测 200；`status=incomplete` 可能只是 `max_output_tokens` 太小。
- `/v1/responses` + `stream:true`：本轮未通过，返回上游认证错误，不建议作为默认写法。
- `/v1/complete`：本轮 404，不支持。
- `/v1/response`：本轮 404，不支持。
- 网络提示：如本机代理污染，可用 `--noproxy '*'`；如网络环境必须代理，先确认本机代理链路可用。

---

## 7. Gemini generateContent

```http
POST /v1beta/models/{model}:generateContent
```

Gemini 使用 Google 原生接口格式，并使用 `x-goog-api-key`。

### Example request

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

文本读取：`candidates[0].content.parts[].text`。

图片读取：`candidates[0].content.parts[].inlineData.data`。

本轮实测：`gemini（文本和图片）` 调 `gemini-3-flash-preview` 返回 `503 No available Gemini accounts`。所以本文保留接口格式，但不把 Gemini 写成当前已通过的可用分组。

---

## 8. Common errors

| 错误 | 常见原因 | 处理方式 |
|---|---|---|
| `401` / unauthorized | Key 错、Header 写错 | 检查 `Authorization: Bearer` 或 Gemini 的 `x-goog-api-key` |
| `SUBSCRIPTION_NOT_FOUND` | 订阅分组没有当前有效订阅 | 换有有效订阅的 Key，或让后台给该用户补齐订阅 |
| `No active subscription found for this group` | Key 属于订阅分组，但没有 active subscription | 不要只看 `/v1/models`，要做业务接口实测 |
| `No available Gemini accounts` | Gemini 分组暂无可用账号 | 等后台补账号或换分组 |
| `Upstream access forbidden` | 访问被拒绝 | 联系管理员检查该分组权限 |
| 请求超时 | 上游慢、账号不可用、模型路由异常 | 先换同组另一个模型；仍失败再联系管理员 |
| 模型可见但业务失败 | `/v1/models` 通过不等于业务接口可用 | 以 `/v1/chat/completions`、`/v1/responses`、`/v1/messages` 等业务接口为准 |

---

## 9. Smoke checklist

接入前至少跑三步：

```text
1. GET /v1/models
2. 按分组跑一个最小业务请求
3. 检查响应里是否真的返回了你要求的标记文本
```

最小业务请求建议：

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "deepseek-v4-flash",
    "stream": false,
    "messages": [{"role": "user", "content": "只回复 SUBLB_OK"}],
    "max_tokens": 32
  }'
```

验收标准：HTTP 200，且 `choices[0].message.content` 包含 `SUBLB_OK`。

---

## 10. 本轮真实测试摘要

测试环境：`https://sub-lb.tap365.org`，使用每个分组下的 active API key 做业务接口 smoke，未在文档中暴露完整 Key。

| 分组 | `/v1/models` | 业务接口结果 |
|---|---:|---|
| `spark` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `start` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `pro` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `super` | 429 | 月额度超限，本轮业务接口未通过；已移出可用推荐表 |
| `ultra` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `Standard` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `GPT basic` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `codex普通(按量付费)` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `codex-pro（按量付费）` | 200 | `gpt-5.5` chat 200，通过；responses 200，通过 |
| `codex优质(按量付费)` | 403 | Access denied，本轮不作为可用示例 |
| `DeepSeek Basic` | 200 | `deepseek-v4-flash` chat 200，通过；`deepseek-v4-pro` chat 200，通过；`deepseek-v4-flash` responses 200，通过 |
| `deepseek` | 200 | `deepseek-v4-pro` responses 200，通过；其余本轮超时 |
| `Grok 文本和图片` | 200 | `grok-4.1-fast` chat 200，通过 |
| `Grok-codex 文图统一月订阅20260430(普通)` | 200 | `grok-4.1-fast` chat 200，通过 |
| `Grok-codex 文图统一月订阅20260430(高级)` | 200 | `grok-4.1-fast` chat 200，通过 |
| `claudecode特价` | 200 | 6 个重点 Claude 模型 `/v1/messages` 非流式 200，返回 `pong`；`claude-fable-5` `/v1/messages` stream 200；`claude-fable-5` `/v1/responses` 非流式 200；`/v1/complete` 和 `/v1/response` 404 |
| `Codex-star（内部邀请分组）` | 403 | `SUBSCRIPTION_NOT_FOUND` |
| `Trial1` | 403 | `SUBSCRIPTION_NOT_FOUND` |
| `start套餐升级` | 未测 | 本轮无 active API key |
| `DeepSeek Flash` | 未测 | 本轮无 active API key |
| `DeepSeek Pro` | 未测 | 本轮无 active API key |
| `DeepSeek 体验周卡` | 200 | chat 本轮超时 |
| `gemini（文本和图片）` | 200 | generateContent 503，无可用 Gemini 账号 |
| `cc特价` | 200 | `/v1/messages` 上游 502 |
