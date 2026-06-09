# Turing 与 turing-sdk 使用指南

测试日期：2026-06-09  
文档版本：v1.0

一句话结论：**日常人工交互用 `turing` / `turinggrok` / `turingdeepseek`，脚本和后端集成用 `turing-sdk`；排障时不要只看 `/health`，必须用 `/v1/models` 和 `/v1/chat/completions` 做真实验收。**

## 1. 快速选择

| 场景 | 推荐入口 | 说明 |
|---|---|---|
| 人工进入 TUI 对话 | `turing` | 默认 Turing Code TUI，适合长会话、人工检查、调试。 |
| 一次性命令输出 | `turing -p "..."` | 适合脚本、快速 smoke、管道处理。 |
| Grok 文本 / 第二意见 | `turinggrok` | 当前经验口径：走 OpenAI-compatible `chat/completions`，模型常用 `grok-4.3`。 |
| DeepSeek 文本 / 读文件任务 | `turingdeepseek` | 当前经验口径：走 `chat/completions`，模型常用 `deepseek-v4-pro`，默认只开最小 Read 工具。 |
| Node.js / 队列 / 服务端集成 | `turing-sdk` | 用 `query`、`stream`、`streamText` 从代码里调用。 |
| 生图 / 改图 | `turing image generate/edit` | 新版图片入口，不再使用历史 `-d` / `-r`。 |

## 2. 安装与入口

公开下载入口：

- `https://turing.tap365.org/`
- `https://tap365.cn/turing/`
- Release assets：`https://github.com/mason0510/sublb-client/releases`

命令行安装示例：

```bash
curl -fsSL https://turing.tap365.org/v1.1.6/install.sh | bash
```

如果需要安装 provider wrapper：

```bash
curl -fsSL https://turing.tap365.org/v1.1.6/setup-provider-wrappers.sh | bash
```

常见入口：

```bash
turing
turingopenai
turinggoogle
turinggrok
turingdeepseek
```

> 注意：源码仓和发包仓是分离的。用户下载、安装、Release assets 应看公开发包仓和上述真实域名，不要把私有源码仓当作下载入口。

## 3. Key 与环境变量

不要把完整 key 写进仓库、日志、文档或聊天记录。文档中只能使用占位符：

```bash
export OPENAI_API_KEY="<你的 OpenAI-compatible key>"
export GROK_API_KEY="<你的 Grok key>"
export DEEPSEEK_API_KEY="<你的 DeepSeek key>"
```

如果不想每次 `export`，可以写入本机工具读取的 settings，例如：

```json
{
  "env": {
    "OPENAI_API_KEY": "<你的 OpenAI-compatible key>",
    "GROK_API_KEY": "<你的 Grok key>",
    "DEEPSEEK_API_KEY": "<你的 DeepSeek key>"
  }
}
```

经验规则：

1. **Grok 和 DeepSeek 的 key 通常不是同一个。** 一个渠道 503，不代表另一个渠道也坏。
2. **503 优先怀疑 key、模型权限或路由权限。** 先测 key，不要先改大段代码。
3. **502 “Upstream stream ended without a terminal response event” 常见于 transport、stream、tools 不匹配。** 先确认是不是该走 `chat/completions`、是否误走了 `responses`、是否默认带了上游不支持的工具列表。
4. `/health` 只能证明网关活着，不能证明模型可用；验收必须打真实业务 API。

## 4. turing CLI 基础用法

进入 Turing Code TUI：

```bash
turing
```

一次性输出：

```bash
turing -p "只回复 ok"
```

查看 verbose stream，适合定位 provider、endpoint、模型和错误：

```bash
turing --output-format stream-json --verbose -p "只回复 ok"
```

图片生成：

```bash
turing image generate "一只赛博朋克风格的橘猫，电影光影"
```

图片编辑：

```bash
turing image edit --image ./input.png "把背景改成雨夜东京街头"
```

不要再使用旧命令形态：

```bash
# 旧口径，避免继续使用
turing -d "提示词"
turing -r ref.png
```

## 5. turinggrok 使用经验

### 5.1 正常用法

裸命令应进入 Turing Code TUI：

```bash
turinggrok
```

一次性问答：

```bash
turinggrok -p "只回复 ok"
```

排障输出：

```bash
turinggrok --output-format stream-json --verbose -p "只回复 ok" | tail -20
```

当前经验口径：

| 项 | 口径 |
|---|---|
| 默认 base | `https://api.tap365.org/v1` |
| 常用模型 | `grok-4.3` |
| 文本 transport | `chat_completions` |
| 图片模型 | `grok-imagine-1.0` |
| key 优先级 | 本机 secret 文件 / `GROK_API_KEY` / settings env，具体以当前 wrapper 为准 |

### 5.2 为什么裸 `turinggrok` 不应该出现 `grok>`

如果运行：

```bash
turinggrok
```

却出现：

```text
turinggrok direct REPL · model=grok-4.3 · base=https://api.tap365.org/v1
输入 exit / quit 退出。
grok>
```

这说明当前命令进了旧 wrapper 的自制 direct REPL，而不是 Turing Code TUI。正确行为应该是进入 Turing Code 的交互命令框。修复方向是：

1. 检查实际命令路径：

   ```bash
   command -v turinggrok
   sed -n '1,220p' "$(command -v turinggrok)"
   ```

2. 确认裸命令分支执行核心 Turing：

   ```text
   exec "$TURING_CORE_BIN" --model "$OPENAI_MODEL" --tools=
   ```

3. `-p` 模式可以直接走 `/v1/chat/completions`，但裸命令必须交给 Turing Code TUI。

### 5.3 Grok 常见错误

| 现象 | 常见原因 | 处理 |
|---|---|---|
| 502：`Upstream stream ended without a terminal response event` | 误走 `responses`、stream 事件不兼容、默认工具列表上游不支持 | 锁定 `chat_completions`；必要时禁用工具 `--tools=`；用 curl 直测 `/chat/completions`。 |
| 503 | key 不可用、模型无权限、路由无权限 | 先测 `/v1/models`，再测 `/v1/chat/completions`；注意 Grok key 和 DeepSeek key 不是同一个。 |
| 裸命令进 `grok>` | wrapper 漂移到 direct REPL | 修 wrapper：裸命令进入 Turing Code TUI，`-p` 才 direct。 |
| TUI 显示 Sonnet / 其他模型 | 环境变量被 Anthropic / Gemini / 全局配置污染 | wrapper 进入核心前清理其他 provider env，并显式设置模型。 |

## 6. turingdeepseek 使用经验

### 6.1 正常用法

进入 TUI：

```bash
turingdeepseek
```

一次性输出：

```bash
turingdeepseek -p "只回复 ok"
```

排障输出：

```bash
turingdeepseek --output-format stream-json --verbose -p "只回复 ok" | tail -20
```

当前经验口径：

| 项 | 口径 |
|---|---|
| 默认 base | `https://sub-lb.tap365.org/v1` |
| 常用模型 | `deepseek-v4-pro` |
| transport | `chat_completions` |
| key | `TURINGDEEPSEEK_API_KEY` / `DEEPSEEK_API_KEY` / wrapper 默认注入，具体以当前机器 wrapper 为准 |
| 工具策略 | 默认 `--tools=Read`，用户显式传 `--tools` 时尊重用户参数 |

### 6.2 为什么会输出 `<|tool_calls_section_begin|>`

如果看到类似：

```text
<|tool_calls_section_begin|>
<|tool_call_begin|> functions.Read:1 ...
```

通常不是模型“坏了”，而是模型想调用 `Read` 工具，但当前工具配置没有真正开放或没有被 Turing core 正确消费。处理方式：

```bash
# 让 wrapper 默认只开 Read，或显式指定
turingdeepseek --tools=Read -p "读取 README.md 并总结"
```

如果任务不需要工具，反而可以禁用：

```bash
turingdeepseek --tools= -p "只回复 ok"
```

### 6.3 DeepSeek 常见错误

| 现象 | 常见原因 | 处理 |
|---|---|---|
| 503 | key 或模型权限问题 | 先用 DeepSeek 专用 key 测 `/v1/models` 和 `/v1/chat/completions`。不要拿 Grok key 测 DeepSeek。 |
| 原样输出 tool call 标记 | 工具没有开放或工具协议不兼容 | 默认 `--tools=Read`；需要更多工具时逐个打开，不要一次性开大工具列表。 |
| TUI 无法继续 | transport / tools / stream 不匹配 | 先用 `-p` + verbose 复现，再 curl 直测 chat completions。 |

## 7. turing-sdk 适用场景

`turing-sdk` 是 Node.js SDK，适合：

- Node.js 服务端调用模型；
- 队列 worker / cron 任务；
- 自动化脚本；
- 需要流式输出的终端工具；
- 需要复用 Turing Code provider 配置、session、预算和超时控制的集成。

不建议直接放到浏览器前端调用，因为 key 会暴露。浏览器前端应请求你自己的后端，由后端调用 `turing-sdk`。

安装：

```bash
pnpm add turing-sdk
# 或
npm install turing-sdk
```

当前本仓 `node_modules/turing-sdk/index.d.ts` 验证到的核心 API：

```ts
import {
  createTuringClient,
  query,
  stream,
  streamText,
  extractTextFromEvent,
} from "turing-sdk";
```

## 8. turing-sdk API 速查

### 8.1 类型

```ts
type TuringProviderPreset =
  | "sublb"
  | "openai"
  | "grok"
  | "google"
  | "gemini"
  | "claude"
  | (string & {});

type TuringOpenAITransport = "responses" | "chat_completions";

type TuringProviderProtocol =
  | "cli"
  | "openai_responses"
  | "openai_chat_completions"
  | "anthropic_messages";
```

### 8.2 常用 options

```ts
interface TuringClientOptions {
  preset?: TuringProviderPreset;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  transport?: TuringOpenAITransport;
  protocol?: TuringProviderProtocol;
  providerProtocol?: TuringProviderProtocol;
  cwd?: string;
  env?: Record<string, string | undefined>;
  extraArgs?: string[];
  includePartialMessages?: boolean;
  maxTurns?: number;
  maxBudgetUsd?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  permissionMode?: string;
  resume?: string;
  sessionId?: string;
  jsonSchema?: string | Record<string, unknown>;
}
```

### 8.3 返回结果

```ts
interface TuringQueryResult {
  text: string;
  result: TuringSdkEvent;
  events: TuringSdkEvent[];
  sessionId?: string;
  totalCostUsd?: number;
  durationMs?: number;
}
```

## 9. turing-sdk 示例

### 9.1 最小 query

```ts
import { query } from "turing-sdk";

const result = await query("只回复 ok", {
  preset: "openai",
  baseUrl: "https://api.tap365.org/v1",
  model: "gpt-5.4",
  apiKey: process.env.OPENAI_API_KEY,
  timeoutMs: 60_000,
});

console.log(result.text);
```

### 9.2 Grok：显式走 chat/completions

```ts
import { query } from "turing-sdk";

const result = await query("给出三条排障建议", {
  preset: "grok",
  baseUrl: "https://api.tap365.org/v1",
  model: "grok-4.3",
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  apiKey: process.env.GROK_API_KEY,
  timeoutMs: 120_000,
});

console.log(result.text);
```

### 9.3 DeepSeek：显式走 chat/completions

```ts
import { query } from "turing-sdk";

const result = await query("只回复 ok", {
  preset: "openai",
  baseUrl: "https://sub-lb.tap365.org/v1",
  model: "deepseek-v4-pro",
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  apiKey: process.env.DEEPSEEK_API_KEY,
  timeoutMs: 120_000,
});

console.log(result.text);
```

注意：`turing-sdk` 走 `chat_completions` 时需要 OpenAI-compatible base URL。这里应写到 `/v1`：

- ✅ `https://sub-lb.tap365.org/v1`
- ❌ `https://sub-lb.tap365.org`

如果少写 `/v1`，本轮真实测试会返回 `405 Method Not Allowed`。这通常表示请求已经打到服务，但 SDK 拼出来的 endpoint / HTTP 方法不是网关接受的 OpenAI-compatible 路径；它不是典型的 key 不可用信号。

### 9.4 复用 client

```ts
import { createTuringClient } from "turing-sdk";

const grok = createTuringClient({
  preset: "grok",
  baseUrl: "https://api.tap365.org/v1",
  model: "grok-4.3",
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  apiKey: process.env.GROK_API_KEY,
  timeoutMs: 120_000,
});

const res = await grok.query("只回复 ok");
console.log(res.text);
```

### 9.5 流式文本输出

```ts
import { streamText } from "turing-sdk";

for await (const chunk of streamText("写三条排查建议", {
  preset: "openai",
  baseUrl: "https://api.tap365.org/v1",
  model: "gpt-5.4",
  apiKey: process.env.OPENAI_API_KEY,
  timeoutMs: 120_000,
})) {
  process.stdout.write(chunk);
}
```

### 9.6 读取事件流

```ts
import { stream, extractTextFromEvent } from "turing-sdk";

for await (const event of stream("解释 turing-sdk 的 query 和 stream 区别", {
  preset: "openai",
  baseUrl: "https://api.tap365.org/v1",
  model: "gpt-5.4",
  apiKey: process.env.OPENAI_API_KEY,
})) {
  const text = extractTextFromEvent(event);
  if (text) process.stdout.write(text);

  if (event.is_error) {
    console.error("\nSDK event error:", event.errors);
  }
}
```

## 10. 真实验收与 key 测试

### 10.1 Grok key 测试

```bash
BASE="https://api.tap365.org/v1"
KEY="<只在本机 shell 使用，不写入文档>"
MODEL="grok-4.3"

curl -sS "$BASE/models" \
  -H "Authorization: Bearer $KEY" | jq .

curl -sS "$BASE/chat/completions" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg model "$MODEL" --arg content "只回复 ok" '{
    model: $model,
    messages: [{role: "user", content: $content}],
    stream: false
  }')" | jq .
```

### 10.2 DeepSeek key 测试

```bash
BASE="https://sub-lb.tap365.org/v1"
KEY="<只在本机 shell 使用，不写入文档>"
MODEL="deepseek-v4-pro"

curl -sS "$BASE/models" \
  -H "Authorization: Bearer $KEY" | jq .

curl -sS "$BASE/chat/completions" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg model "$MODEL" --arg content "只回复 ok" '{
    model: $model,
    messages: [{role: "user", content: $content}],
    stream: false
  }')" | jq .
```

验收口径：

| API | 通过标准 |
|---|---|
| `/v1/models` | HTTP 200，返回列表里能看到目标模型或至少确认 key 有模型列表权限。 |
| `/v1/chat/completions` | HTTP 200，`choices[0].message.content` 有真实模型输出。 |
| `/health` | 只算存活检查，不算模型业务验收。 |

## 11. 排障清单

| 问题 | 优先检查 | 快速命令 |
|---|---|---|
| 不确定实际执行的是哪个 wrapper | `command -v` 和 wrapper 内容 | `command -v turinggrok && sed -n '1,220p' $(command -v turinggrok)` |
| 不确定模型 / endpoint | verbose stream | `turinggrok --output-format stream-json --verbose -p "只回复 ok"` |
| 503 | key、模型权限、route 权限 | 直测 `/v1/models` 和 `/v1/chat/completions` |
| 502 terminal response event | transport / stream / tools | 锁 `chat_completions`，禁用或收窄 tools |
| TUI 显示错误模型 | 全局环境污染 | wrapper 内 unset 其他 provider env，显式传 `--model` |
| DeepSeek 原样输出 tool call | tools 未开放 | `--tools=Read` 或 `--tools=` |
| 生图命令不工作 | 使用了旧 `-d` / `-r` | 改用 `turing image generate/edit` |

## 12. 推荐工作流

### 12.1 新渠道接入

1. 确认 base URL 是否带 `/v1`。
2. 用目标 key 测 `/v1/models`。
3. 用目标 key + 目标模型测 `/v1/chat/completions`。
4. 再配置 wrapper 或 SDK。
5. 最后用 `turing... -p "只回复 ok"` 和 TUI 各测一次。

### 12.2 wrapper 修改

1. 先备份或记录当前 wrapper 路径。
2. 明确裸命令和 `-p` 命令的分支：
   - 裸命令：进入 Turing Code TUI；
   - `-p`：可以走 direct `chat/completions`，便于稳定脚本输出。
3. 清理无关 provider env，避免路由漂移。
4. 对 Grok / DeepSeek 这类上游，默认收窄 tools。
5. 改完做真实 smoke。

### 12.3 SDK 集成

1. 服务端保存 key，不把 key 发到浏览器。
2. options 里显式写 `baseUrl`、`model`、`transport`、`protocol`，减少默认值漂移。
3. 加 `timeoutMs` 和 `AbortSignal`，避免 worker 卡死。
4. 记录 `sessionId`、`durationMs`、`totalCostUsd`，方便审计。
5. 失败时保存脱敏错误：HTTP 状态、endpoint、模型、错误 type，不保存完整 key。

## 13. 最小完成检查

```bash
# CLI smoke
turing -p "只回复 ok"
turinggrok -p "只回复 ok"
turingdeepseek -p "只回复 ok"

# TUI smoke：应进入 Turing Code TUI，不应进入 grok> 自制 REPL
turinggrok

# SDK 类型和版本
node -e "const p=require('turing-sdk/package.json'); console.log(p.version, p.engines)"

# 文档密钥泄露检查
PATTERN='s''k-[A-Za-z0-9]|AI''za|Bear''er [A-Za-z0-9]'
rg -n "$PATTERN" drafts/turing-docs/docs/turing-and-sdk-usage.md
```

如果最后一条命令有输出，说明文档里可能写入了完整密钥或疑似密钥，必须先删掉再提交。
