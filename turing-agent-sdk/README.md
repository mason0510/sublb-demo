# turing-agent-sdk demo

一句话结论：这个目录演示 `turing-agent-sdk` 的 Claude Agent SDK 兼容用法；如果你要完整 agent loop、MCP、Skill、子 Agent 和权限控制，看这里；如果只是调模型文本接口，看 `../turing-sdk-agent-demo`。

## turing-sdk 和 turing-agent-sdk 怎么选

| 需求 | 推荐包 | 说明 |
|---|---|---|
| Node 脚本里请求一次模型 | `turing-sdk` | 轻量，适合 `query` / `streamText` / OpenAI-compatible chat/completions。 |
| 后端服务里直接调 Grok / DeepSeek / OpenAI-compatible | `turing-sdk` | 你自己管理工具调用和业务流程。 |
| 让模型进入 agent loop，能按权限使用工具 | `turing-agent-sdk` | API 对齐 `@anthropic-ai/claude-agent-sdk`，默认启动 `turing` runtime。 |
| 使用 SDK MCP server / 外挂 MCP | `turing-agent-sdk` | 用 `createSdkMcpServer()` 或 `mcpServers`。 |
| 使用本地 skill / 子 Agent | `turing-agent-sdk` | 用 `skills`、`agents`、`agent`、`settingSources`。 |

## 安装

```bash
cd turing-agent-sdk
pnpm install
# 或 npm install
```

`turing-agent-sdk` 默认会启动 PATH 里的 `turing`。如果你没有全局安装 Turing Code：

```bash
curl -fsSL https://turing.tap365.org/v1.1.7/install.sh | bash
```

如果你要指定一个本地二进制：

```bash
cp .env.example .env
# 编辑 .env，把 TURING_BINARY_PATH 设置为 `command -v turing` 输出的绝对路径
command -v turing
set -a
source .env
set +a
```

> 不要把真实 key 写入代码、README、Issue、截图或提交记录。key 通常由你的 `turing` / provider wrapper / `~/.claude/settings.json` 管理。

## 运行示例

```bash
pnpm run minimal
pnpm run mcp
pnpm run skill -- "用户说 turingdeepseek 返回 405，是不是 key 坏了？"
pnpm run legal -- "客户说供应商拖欠货款 38 万，有合同和送货单"
```

如果不用 pnpm，也可以直接：

```bash
node examples/01-minimal-query.mjs
```

## 示例说明

| 文件 | 展示能力 | 安全边界 |
|---|---|---|
| `examples/01-minimal-query.mjs` | 最小 `query()` agent 调用 | `permissionMode: "plan"`，不开放工具。 |
| `examples/02-sdk-mcp-calculator.mjs` | `createSdkMcpServer()` + `tool()` 定义 in-process MCP 工具 | 只允许 `mcp__utilities__add`。 |
| `examples/03-skill-support-agent.mjs` | 本地 skill + 子 Agent 的客服分诊 | 只输出分类和回复，不要求用户暴露完整 key。 |
| `examples/04-legal-intake-agent.mjs` | 法律 intake / Claude for Legal 风格助手 | 只做材料整理，不给胜诉承诺，不替代律师。 |
| `python/01-minimal-query.py` | Python 版最小 query | 同样默认不开放工具。 |

## 和 Claude Agent SDK 的对应关系

`turing-agent-sdk` 的目标是让 Claude Agent SDK 风格代码尽量少改：

```diff
-import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
+import { query, createSdkMcpServer, tool } from "turing-agent-sdk";
```

Python 也是同样思路：

```diff
-from claude_agent_sdk import query
+from turing_agent_sdk import query
```

常用 options 基本沿用 Claude Agent SDK 口径：

| option | 用途 |
|---|---|
| `cwd` | agent 工作目录。 |
| `pathToTuringExecutable` | turing-agent-sdk 扩展字段，用来指定 `turing` 二进制。 |
| `allowedTools` / `disallowedTools` | 工具白名单 / 黑名单。 |
| `permissionMode` | 权限模式；demo 默认尽量用 `plan` 或最小工具白名单。 |
| `mcpServers` | SDK MCP server 或外部 MCP server 配置。 |
| `skills` | 启用本地 skill。 |
| `agents` / `agent` | 定义并选择子 Agent。 |
| `maxTurns` | 限制 agent loop 最大轮数，避免失控。 |
| `settingSources` | 控制读取 user/project/local settings。 |

## 外挂 skill 怎么组织

本 demo 把 skill 放在：

```text
.claude/skills/customer-support/SKILL.md
.claude/skills/legal-intake/SKILL.md
```

示例里通过：

```js
options: {
  cwd: process.cwd(),
  settingSources: ["user", "project"],
  skills: ["customer-support"],
  agents: {
    "support-specialist": {
      description: "客服分诊专家",
      prompt: "先归类问题，再给出可执行建议。",
      tools: [],
    },
  },
  agent: "support-specialist",
}
```

关键边界：skill 是规则和上下文，不是密钥保险箱；不要把 API key、cookie、token 写进 skill。

## MCP 怎么接

最小方式是 SDK 内进程 MCP：

```js
import { createSdkMcpServer, tool } from "turing-agent-sdk";

const utilities = createSdkMcpServer({
  name: "utilities",
  version: "1.0.0",
  tools: [addTool],
});
```

然后把它挂进 query：

```js
options: {
  mcpServers: { utilities },
  allowedTools: ["mcp__utilities__add"],
}
```

生产环境接外部 MCP 时，仍要做工具白名单、鉴权、审计和写操作二次确认；不要默认把所有工具开放给 agent。

## 405 / 503 小白排障口径

- `405 Method Not Allowed`：优先检查 `baseUrl + path`、HTTP method、是否重复或漏掉 `/v1`；405 通常不是 key 失效。
- `503`：更像对应 provider 的 key、额度、上游账号或调度不可用；Grok、DeepSeek、OpenAI 的 key 不通用，要用对应 key 验证 `/v1/chat/completions`。
- `502` 且提示 stream 没有 terminal event：优先切到 `chat/completions` 非流式 smoke，看上游是否能完整返回。

## 验收标准

- `node --check examples/*.mjs` 只算语法检查。
- 真正跑通至少要执行 `pnpm run minimal` 并看到模型文本，例如 `ok`。
- MCP 示例要看到 `42` 或等价结果。
