# Sublb 生图对外 API 文档

测试日期：2026-04-30

文档版本：v4.0

> 本文档已升级迁移。新的对外文档不再只覆盖生图，而是统一覆盖 Grok / OpenAI / Gemini / Claude 的 OpenAI-compatible API 接入口径。

请使用新版文档：

- [sublb_grok_openai_gemini_claude_API文档.md](sublb_grok_openai_gemini_claude_API文档.md)

当前本轮已实测可用的图片模型：

| Provider | 模型 | 接口 | 本轮状态 |
|---|---|---|---|
| Grok | `grok-imagine-1.0` | `POST /v1/images/generations` | 200，通过 |
| OpenAI | `gpt-image-2` | `POST /v1/images/generations` | 200，通过 |

本轮证据目录：

```text
test_runs/20260430_120929_sublb_grok_openai_gemini_claude_api_doc/
```
