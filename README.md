# sublb-demo

SubLB API 的公开 Demo 仓库。

这不是平台内部说明书，而是给**第一次拿到 SubLB API Key 的接入方**准备的测试文档入口。

---

## 先看哪份文档

| 你现在要做什么 | 看哪份文档 |
|---|---|
| 用 Postman / Apifox / curl 跑通接口 | [SubLB API 测试文档（Postman / Apifox 风格）](docs/postman-apifox-api-test.md) |
| 不理解 Key、Base URL、分组、模型、返回字段 | [API 测试解释说明](docs/api-test-explainer.md) |
| 查完整接口字段、模型边界、分组清单 | [完整 API Reference](sublb_grok_openai_gemini_claude_deepseek_API文档.md) |
| 做图片生成 / 图片编辑 | [生图新手使用指南](生图新手使用指南.md) / [gpt-image-2 使用指南](gpt-image-2使用指南.md) |
| 用 Node.js / Agent 集成 | [turing-sdk-agent-demo](turing-sdk-agent-demo/README.md) |
| 排查第三方客户端 | [第三方客户端问题汇总](第三方客户端问题汇总.md) |

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

## 文档结构

```text
sublb-demo/
├── README.md                                      # 入口导航
├── docs/
│   ├── postman-apifox-api-test.md                 # API 测试文档，给小白照着跑
│   ├── api-test-explainer.md                      # 概念解释说明
│   ├── turing-and-sdk-usage.md                    # Turing / SDK 使用说明
│   └── sdk/turing-sdk.md
├── sublb_grok_openai_gemini_claude_deepseek_API文档.md  # 完整 API Reference
├── 生图新手使用指南.md
├── gpt-image-2使用指南.md
├── QA常见问题.md
├── 第三方客户端问题汇总.md
├── examples/
├── tests/
└── turing-sdk-agent-demo/
```

---

## 维护原则

- README 只做入口导航，不堆长模型表。
- API 测试文档按 Postman / Apifox 风格组织：环境变量、认证、接口目录、请求体、读取字段、错误排查。
- 解释说明文档只解释概念，不混入完整 API Reference。
- 完整 API Reference 保留给高级用户查字段和边界。
- 不把真实 API Key、admin key、cookie、token 写进仓库。
- 未经真实业务接口测试的模型，不写成“可用”。
