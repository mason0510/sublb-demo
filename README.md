# sublb-demo

SubLB API 的公开 Demo 仓库。

这不是平台内部说明书，而是给**第一次拿到 SubLB API Key 的接入方**准备的 API 测试入口。

---

## 新手三步走

1. 打开 `API_TEST.md`：按 Postman / Apifox 风格跑通接口。
2. 如果让 AI / Cursor / Claude Code / Codex 帮你接入，把 `AI_AGENT.md` 发给它。
3. 需要查完整字段、模型边界、错误码，再看 `API_REFERENCE.md`。

---

## provider 入口

### 通用入口

- `API_TEST.md`：先跑通最小请求
- `AI_AGENT.md`：给 AI 的接入提示
- `API_REFERENCE.md`：完整字段、模型边界、错误码

### provider / 能力目录

- `openai/README.md`：OpenAI / GPT / Codex 接入口径
- `gemini/README.md`：Gemini 接入口径
- `anthropic/README.md`：Claude / Anthropic 接入口径
- `grok/README.md`：Grok 图片与视频接入、价格口径、异步轮询、注意事项
- `seedance/README.md`：Seedance 视频接入、按次/按秒计费区分、对接 demo、注意事项

一句话结论：

- **Grok**：图像模型可接，视频模型已跑通，但当前更稳的卖法是**先按 4 秒卖**，不要先吹满 15 秒。
- **Seedance**：先锁清楚后台到底是**按次价还是按秒价**，别把 `0.24 / 条` 误算成 `0.24 / 秒`。

---

## 根目录只保留这些

```text
sublb-demo/
├── README.md          # 你现在看的入口
├── API_TEST.md        # 给小白 / Postman / Apifox 的接口测试文档
├── AI_AGENT.md        # 给 AI Agent 看的接入提示词
├── API_REFERENCE.md   # 完整 API Reference
├── openai/            # OpenAI / GPT / Codex 说明
├── gemini/            # Gemini 说明
├── grok/              # Grok 说明
├── seedance/          # Seedance 视频说明
└── anthropic/         # Claude / Anthropic 说明
```

`.env.example`、`.gitignore`、`LICENSE` 是仓库必要文件，不是接口文档入口。

---

## 30 秒跑通一个文本请求

```bash
export SUBLB_BASE_URL="https://sub-lb.tap365.org"
export SUBLB_API_KEY="替换成你的 SubLB API Key"

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

---

## 维护原则

- README 只做入口导航。
- `API_TEST.md` 只写小白能照着跑的 Postman / Apifox / curl 测试步骤。
- `AI_AGENT.md` 只写给 AI 的接入边界和提示词。
- `API_REFERENCE.md` 才放完整字段和高级边界。
- provider 目录只放当前 provider 的简短说明，不堆历史测试文件。
- 不把真实 API Key、admin key、cookie、token 写进仓库。
- 未经真实业务接口测试的模型，不写成“可用”。
