# Sublb 生图对外 API 文档

测试日期：2026-05-01

文档版本：v4.3

> 本文档已升级迁移。新的对外文档不再只覆盖生图，而是统一覆盖 Grok / OpenAI / Gemini / Claude / DeepSeek 的接入口径。

请使用新版文档：

- [sublb_grok_openai_gemini_claude_deepseek_API文档.md](sublb_grok_openai_gemini_claude_deepseek_API文档.md)
- `gpt-image-2` 专项使用指南：[gpt-image-2使用指南.md](gpt-image-2使用指南.md)

图片相关入口请优先查看新版文档与专项指南中的以下章节：

- OpenAI / Grok 生图：`POST /v1/images/generations`
- OpenAI 图片编辑：`POST /v1/images/edits`
- Gemini 原生图片：`POST /v1beta/models/{model}:generateContent`

当前推荐图片模型：

| Provider | 模型 | 核心使用 | 响应重点 |
|---|---|---|---|
| OpenAI | `gpt-image-2` | 生图走 `POST /v1/images/generations`，图片编辑走 `POST /v1/images/edits` | `data[0].b64_json` |
| Grok | `grok-imagine-1.0` | 生图走 `POST /v1/images/generations` | `data[0].url` |
| Gemini | `gemini-3-pro-image` | 原生生图走 `POST /v1beta/models/{model}:generateContent` | `inlineData.data` |
| Gemini | `gemini-3.1-flash-image-preview` | 原生生图走 `POST /v1beta/models/{model}:generateContent` | `inlineData.data` |
| Gemini | `gemini-3.1-flash-image` | 原生生图走 `POST /v1beta/models/{model}:generateContent` | `inlineData.data` |

如果只接图片能力：OpenAI / Grok 按 OpenAI 图片接口接；Gemini 按原生 `generateContent` 接，不要混用。
