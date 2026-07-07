# Gemini

Gemini 相关接入口径。

小白先看根目录：

1. `README.md`
2. `API_TEST.md`
3. `AI_AGENT.md`
4. `API_REFERENCE.md`

推荐使用 Gemini 原生接口：

```text
POST /v1beta/models/{model}:generateContent
x-goog-api-key: <SUBLB_API_KEY>
```

不要把 Gemini 原生接口当成 OpenAI-compatible 接口。
