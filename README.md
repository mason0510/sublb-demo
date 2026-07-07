# sublb-demo

SubLB API 的公开 Demo 仓库。

这不是平台内部说明书，而是给**第一次拿到 SubLB API Key 的接入方**准备的测试文档入口。

---

## 新手三步走

1. 先看 [API 测试文档（Postman / Apifox 风格）](docs/postman-apifox-api-test.md)。
2. 不懂 Key、Base URL、模型、返回字段时，看 [API 测试解释说明](docs/api-test-explainer.md)。
3. 让 AI / Cursor / Claude Code / Codex 帮你接入时，把 [AI Agent 接入说明](docs/ai-agent-instructions.md) 发给它。

---

## 先看哪份文档

| 你现在要做什么 | 看哪份文档 |
|---|---|
| 用 Postman / Apifox / curl 跑通接口 | [SubLB API 测试文档（Postman / Apifox 风格）](docs/postman-apifox-api-test.md) |
| 不理解 Key、Base URL、分组、模型、返回字段 | [API 测试解释说明](docs/api-test-explainer.md) |
| 让 AI / Cursor / Claude Code / Codex 帮你接入 | [AI Agent 接入说明](docs/ai-agent-instructions.md) |
| 查完整接口字段、模型边界、分组清单 | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md) |

---

## 30 秒跑通一个文本请求

先设置环境变量：

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="替换成你的 SubLB API Key"
```

再请求文本接口：

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

成功后读取：

```text
choices[0].message.content
```

如果你的 Key 是 DeepSeek，把 `model` 改成 `deepseek-v4-flash` 或 `deepseek-v4-pro`。
如果你的 Key 是 Grok，把 `model` 改成 `grok-4.1-fast`。
如果你的 Key 是 Claude、Gemini 或图片，请直接看 [API 测试文档](docs/postman-apifox-api-test.md) 选择对应接口。

---

## 目录结构

```text
sublb-demo/
├── README.md
├── docs/
│   ├── postman-apifox-api-test.md      # API 测试文档，给小白照着跑
│   ├── api-test-explainer.md           # 概念解释说明
│   ├── ai-agent-instructions.md        # 给 AI / Agent 的接入提示词
│   └── archive/                        # 旧文档、历史测试、SDK 示例归档
├── openai/                             # OpenAI 相关样例/记录
├── gemini/                             # Gemini 相关样例/说明
├── grok/                               # Grok 相关样例/记录
├── anthropic/                          # Claude / Anthropic 相关样例/说明
└── sublb_grok_openai_gemini_claude_deepseek_API文档.md  # 完整 API Reference
```

---

## 维护原则

- README 只做入口导航，不堆长模型表。
- 顶层只保留清晰入口：provider 目录、README、docs、完整 API Reference。
- API 测试文档按 Postman / Apifox 风格组织：环境变量、认证、接口目录、请求体、读取字段、错误排查。
- 解释说明文档只解释概念，不混入完整 API Reference。
- AI Agent 文档只给 AI 明确接入边界、固定提示词、接口选择规则和禁止事项。
- 完整 API Reference 保留给高级用户查字段和边界。
- 旧文档、历史测试、SDK 示例统一放进 `docs/archive/`，不要堆在仓库根目录。
- 不把真实 API Key、admin key、cookie、token 写进仓库。
- 未经真实业务接口测试的模型，不写成“可用”。
