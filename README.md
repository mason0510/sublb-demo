# sublb-demo

SubLB API 的公开 Demo 仓库。它不是给平台开发者看的内部说明，而是给**第一次拿到 SubLB API Key 的接入方**看的上手文档。

你只需要先搞清楚 3 件事：

1. 你的 Key 属于哪个分组。
2. 这个分组应该调用哪个接口。
3. 返回结果应该从哪个字段读取。

- Base URL：`https://sub-lb.tap365.org`
- 认证方式：`Authorization: Bearer <YOUR_SUBLB_API_KEY>`
- 完整 API Reference：[sublb_grok_openai_gemini_claude_deepseek_API文档.md](sublb_grok_openai_gemini_claude_deepseek_API文档.md)
- 生图新手指南：[生图新手使用指南.md](生图新手使用指南.md)
- `gpt-image-2` 生图 / 修图 / 遮罩编辑：[gpt-image-2使用指南.md](gpt-image-2使用指南.md)
- Turing / turing-sdk 使用指南：[docs/turing-and-sdk-usage.md](docs/turing-and-sdk-usage.md)

## 30 秒快速开始

### 第 1 步：准备 Key

把你的 API Key 放到环境变量里。不要把真实 Key 写进代码、截图或公开 issue。

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="替换成你的 SubLB API Key"
```

如果你不知道自己的 Key 属于哪个分组，先问发 Key 的人。分组决定你能用哪些模型。

### 第 2 步：先复制这段测通文本对话

大多数文本 Key 可以先用 OpenAI-compatible 接口测试：

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

成功时，你会在返回 JSON 里看到类似：

```json
{
  "choices": [
    {
      "message": {
        "content": "SUBLB_OK"
      }
    }
  ]
}
```

读取结果字段：`choices[0].message.content`。

> 如果你的分组是 DeepSeek，把 `model` 改成 `deepseek-v4-flash` 或 `deepseek-v4-pro`。
> 如果你的分组是 Grok，把 `model` 改成 `grok-4.1-fast`。
> 如果你的分组是 Claude，不要用这个接口，直接看下面的 Claude 示例。

### 第 3 步：按你的分组选择接口

| 你拿到的 Key 类型 | 先用哪个接口 | 先填哪个模型 | 去看哪份文档 |
|---|---|---|---|
| OpenAI / GPT / Codex 文本 | `/v1/chat/completions` | `gpt-5.5` | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md#3-openai-compatible-chat-completions) |
| DeepSeek 文本 | `/v1/chat/completions` | `deepseek-v4-flash` | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md#3-openai-compatible-chat-completions) |
| Grok 文本 | `/v1/chat/completions` | `grok-4.1-fast` | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md#3-openai-compatible-chat-completions) |
| Claude | `/v1/messages` | `claude-fable-5` | [Claude Messages 示例](sublb_grok_openai_gemini_claude_deepseek_API文档.md#6-claude-messages) |
| OpenAI / Grok 图片 | `/v1/images/generations` | `gpt-image-2` 或 `grok-imagine-1.0` | [生图新手指南](生图新手使用指南.md) |
| Gemini | `/v1beta/models/{model}:generateContent` | 按可用模型填写 | [Gemini 原生接口](sublb_grok_openai_gemini_claude_deepseek_API文档.md#7-gemini-原生-generatecontent) |

一个 Key 通常只对应一个后台分组。不要按“一个 Key 能调用所有模型”理解。

## 常见问题先看这里

### Q1：我应该先用哪个模型？

- GPT / OpenAI / Codex：先试 `gpt-5.5`。
- DeepSeek：先试 `deepseek-v4-flash`。
- Grok：先试 `grok-4.1-fast`。
- Claude：先试 `claude-fable-5`，接口用 `/v1/messages`。
- 图片：OpenAI 图片先试 `gpt-image-2`；Grok 图片先试 `grok-imagine-1.0`。

### Q2：怎么知道我的 Key 能看到哪些模型？

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY"
```

注意：`/v1/models` 只能说明“能看到模型”，不等于业务接口一定能跑通。最终以 `/v1/chat/completions`、`/v1/responses`、`/v1/messages` 或图片接口实测为准。

### Q3：请求失败先查什么？

| 现象 | 优先检查 |
|---|---|
| 401 / Unauthorized | Key 是否复制完整，Header 是否是 `Authorization: Bearer ...` |
| 404 | 路径是否写错，例如 Claude 是 `/v1/messages` 不是 `/v1/message` |
| 405 | Base URL 或路径不对，确认是否多拼或少拼了 `/v1` |
| 429 / 限额错误 | 分组额度、日限额、月限额是否已用完 |
| 502 / 503 | 上游账号暂不可用，换模型/分组或联系平台处理 |
| 返回字段不知道读哪里 | Chat 读 `choices[0].message.content`；Responses 读 `output_text`；Claude 读 `content[].text`；图片读 `data[0].url` 或 `data[0].b64_json` |

## 最小 Claude 示例

Claude 走 Anthropic Messages 风格接口：

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/messages" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-fable-5",
    "max_tokens": 64,
    "messages": [
      {"role": "user", "content": "只回复 SUBLB_CLAUDE_OK"}
    ]
  }'
```

读取结果字段：`content[].text`。

## 最小图片示例

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/images/generations" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "White background, simple blue letter O icon",
    "size": "1024x1024",
    "n": 1
  }'
```

读取结果字段：OpenAI 图片通常是 `data[0].b64_json`，Grok 图片通常是 `data[0].url`。

## 下一步看什么

| 目标 | 文档 |
|---|---|
| 接 API、查字段、查模型 | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md) |
| 新手做图片生成 | [生图新手使用指南.md](生图新手使用指南.md) |
| 使用 `gpt-image-2` 做生图/修图/遮罩 | [gpt-image-2使用指南.md](gpt-image-2使用指南.md) |
| 排查第三方客户端 | [第三方客户端问题汇总.md](第三方客户端问题汇总.md) |
| 常见报错 | [QA常见问题.md](QA常见问题.md) |
| 用 Node.js / Agent 集成 | [turing-sdk-agent-demo/README.md](turing-sdk-agent-demo/README.md) |

## Turing / turing-sdk 怎么选

这个仓库不只提供裸 API curl，也提供面向用户和开发者的 Turing 接入路径：

| 场景 | 推荐入口 | 说明 |
|---|---|---|
| 人工对话、临时排障、进入 TUI | `turing` | 给人用的 Turing Code 入口，适合交互式问答和排障。 |
| Grok 第二意见 / Grok 文本任务 | `turinggrok` | Grok provider wrapper；当前文档口径要求走 OpenAI-compatible `chat/completions`。 |
| DeepSeek 文本 / 读文件任务 | `turingdeepseek` | DeepSeek provider wrapper；如果原始接口 405，优先检查 base URL 和 `/v1/chat/completions` 路径。 |
| Node.js 服务、脚本、队列、Agent | `turing-sdk` | npm SDK，适合后端集成和自动化任务，不建议直接放浏览器前端暴露 key。 |
| Agent 示例收集 | [`turing-sdk-agent-demo/`](turing-sdk-agent-demo/) | 已放入 query、stream、Grok、DeepSeek、最小 Agent loop、routing、evaluator-optimizer、orchestrator-workers、客服 Agent、法律 intake Agent、skill loader、MCP-style 工具 Agent 示例。 |

小白选择建议：

1. 只是想打开一个像 Claude Code 一样的交互命令框：先装 `turing`，然后运行 `turing`。
2. 想在终端直接用 Grok / DeepSeek：运行 `turinggrok` 或 `turingdeepseek`。
3. 想把能力接到自己的 Node.js 项目、后端服务或 Agent：用 `turing-sdk`，先看 [`turing-sdk-agent-demo/README.md`](turing-sdk-agent-demo/README.md)。应用可以把本地 skill 文本放进 `turing-sdk` 的 `systemPrompt`；MCP 建议先由应用层调用工具，再把工具结果交给 SDK。
4. 配 key 时只放环境变量或本机配置文件，不要写进代码和 README。

## Turing 文档维护要求

Turing 安装命令是用户可直接复制执行的公开命令，必须按真实可访问链接维护。

当前已验证可用：

```bash
curl -fsSL https://turing.tap365.org/v1.1.7/install.sh | bash
curl -fsSL https://turing.tap365.org/v1.1.7/setup-provider-wrappers.sh | bash
```

维护红线：

- 改版本号前必须先验证远端脚本返回 200，例如：
  `curl --noproxy '*' -fsSIL https://turing.tap365.org/vX.Y.Z/install.sh`
- `install.sh` 和 `setup-provider-wrappers.sh` 都验证通过后，才能写入 README / docs / 安装页。
- 禁止把未发布、返回 404、或只凭本地版本猜出来的安装链接写进用户可见文档。

## 一张图看懂

```text
拿到 SubLB 分组 Key
└── 先确认 Key 属于哪个后台分组
    ├── spark / start / pro / ultra / Standard / GPT basic -> OpenAI-compatible
    │   └── /v1/chat/completions 或 /v1/responses
    ├── DeepSeek Basic / deepseek -> DeepSeek OpenAI-compatible
    │   └── /v1/chat/completions 或 /v1/responses
    ├── Grok 文本和图片 / Grok-codex 文图统一 -> Grok 文本和图片
    │   └── /v1/chat/completions 或 /v1/images/generations
    ├── open-img分组包月 -> OpenAI 图片
    │   └── /v1/images/generations 或 /v1/images/edits
    ├── claudecode特价 -> Claude Messages / Claude Fable 5
    │   └── /v1/messages；claude-fable-5 也支持 /v1/responses 非流式 JSON
    └── gemini（文本和图片） -> Gemini 原生
        └── /v1beta/models/{model}:generateContent
```

一个 Key 只代表一个后台分组的权限。不要按“全平台万能 Key”理解。

## 快速开始

复制环境变量模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
SUBLB_BASE_URL="https://sub-lb.tap365.org"
SUBLB_API_KEY="your_api_key_here"
SUBLB_MODEL="deepseek-v4-flash"
```

导入环境变量：

```bash
set -a
source .env
set +a
```

不要把真实密钥提交到 GitHub。

## 当前接入口径

测试日期：2026-06-10

文档版本：v4.1

| 后台分组 | 适合做什么 | 推荐接口 | 推荐模型 | 本轮 smoke |
|---|---|---|---|---|
| `spark` | GPT PRO+GPT plus 轻量入门档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `start` | GPT PRO+GPT plus 稳定入门档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `pro` | GPT PRO+GPT plus 进阶生产档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `ultra` | GPT PRO+GPT plus 旗舰稳定档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `Standard` | GPT PRO+GPT plus 主力档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `GPT basic` | gpt plus 普通入门档 | `/v1/chat/completions`、`/v1/responses` | `gpt-5.5`，也可按 `/v1/models` 选择 GPT/Codex 系列 | chat、responses 通过 |
| `DeepSeek Basic` | DeepSeek 通用接入 | `/v1/chat/completions`、`/v1/responses` | `deepseek-v4-flash`、`deepseek-v4-pro` | chat 两个模型通过；responses flash 通过 |
| `deepseek` | DeepSeek 按量测试 | `/v1/chat/completions`、`/v1/responses` | `deepseek-v4-pro` | responses pro 通过；其他本轮超时 |
| `Grok 文本和图片` | Grok 文本、Grok 生图 | `/v1/chat/completions`、`/v1/images/generations` | `grok-4.1-fast`、`grok-imagine-1.0` | 文本通过 |
| `Grok-codex 文图统一月订阅20260430(普通)` | Grok 文图普通套餐 | `/v1/chat/completions`、`/v1/images/generations` | `grok-4.1-fast`、`grok-imagine-1.0` | 文本通过 |
| `Grok-codex 文图统一月订阅20260430(高级)` | Grok 文图高级套餐 | `/v1/chat/completions`、`/v1/images/generations` | `grok-4.1-fast`、`grok-imagine-1.0` | 文本通过 |
| `open-img分组包月` | OpenAI 生图、图片编辑 | `/v1/images/generations`、`/v1/images/edits` | `gpt-image-2` | 本轮未测，见生图专项文档 |
| `claudecode特价` | Claude 原生 Messages、Claude Fable 5 | `/v1/messages`；`/v1/responses` 非流式 JSON | `claude-fable-5`、`claude-haiku-4-5-20251001`、`claude-opus-4-6/4-7/4-8`、`claude-sonnet-4-6` | `/v1/messages` 非流式 6 个模型通过；`claude-fable-5` `/v1/messages` stream 通过；`/v1/responses` 非流式通过 |
| `gemini（文本和图片）` | Gemini 原生文本和图片 | `/v1beta/models/{model}:generateContent` | `gemini-3-flash-preview` 等 | 本轮 503，无可用 Gemini 账号 |

`super` 本轮月额度超限，暂不作为 README 可用示例。`Old*`、`用户勿选`、`自测`、`状态探针` 分组也不作为 README 推荐接入示例。

## 最小 curl 示例

### 1. 列出模型

```bash
curl --noproxy '*' "$SUBLB_BASE_URL/v1/models" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json"
```

### 2. DeepSeek 文本对话

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

读取：`choices[0].message.content`。

### 3. Responses

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

读取：`output_text` 或 `output[].content[].text`。

### 4. Claude Messages

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

读取：`content[].text`。

### Claude Fable 5 与 Claude 4.x 模型

本轮重点按 Anthropic 原生 `/v1/messages` 验收，不把 `/v1/chat/completions` 作为 Claude 默认接入口径。

| 模型 | `/v1/messages` 非流式 | 备注 |
|---|---|---|
| `claude-fable-5` | 200，返回 `pong` | 支持 `/v1/messages` stream；支持 `/v1/responses` 非流式 JSON |
| `claude-haiku-4-5-20251001` | 200，返回 `pong` | - |
| `claude-opus-4-6` | 200，返回 `pong` | - |
| `claude-opus-4-7` | 200，返回 `pong` | - |
| `claude-opus-4-8` | 200，返回 `pong` | - |
| `claude-sonnet-4-6` | 200，返回 `pong` | - |

接口边界：

- `/v1/messages`：支持非流式；`claude-fable-5` 流式实测 200，返回标准 SSE 事件。
- `/v1/responses`：`claude-fable-5` 支持非流式 JSON，实测 200；`status=incomplete` 可能只是 `max_output_tokens` 太小。
- `/v1/responses` + `stream:true`：本轮未通过，不建议作为默认写法。
- `/v1/complete`：本轮 404，不支持。
- `/v1/response`：本轮 404，不支持。
- 网络提示：如本机代理污染，可用 `--noproxy '*'`；如网络环境必须代理，先确认本机代理链路可用。

### 5. Gemini 原生文本

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

读取：`candidates[0].content.parts[].text`。注意：本轮 `gemini（文本和图片）` 返回 503，无可用 Gemini 账号，当前不写成已通过。

### 6. 图片生成

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

## 目录

```text
sublb-demo/
├── .env.example
├── README.md
├── sublb_grok_openai_gemini_claude_deepseek_API文档.md
├── gpt-image-2使用指南.md
├── Sublb生图对外API文档.md
├── QA常见问题.md
├── 第三方客户端问题汇总.md
├── examples/
│   ├── curl/
│   └── python/
├── turing-sdk-agent-demo/
│   ├── README.md
│   └── examples/
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
