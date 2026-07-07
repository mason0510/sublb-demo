# OpenAI

OpenAI / GPT / Codex 相关接入口径。

小白先看根目录：

1. `README.md`
2. `API_TEST.md`
3. `AI_AGENT.md`
4. `API_REFERENCE.md`

常用接口：

| 能力 | 接口 | 首测模型 |
|---|---|---|
| 文本对话 | `POST /v1/chat/completions` | `gpt-5.5` |
| Responses | `POST /v1/responses` | `gpt-5.5` |
| 图片生成 | `POST /v1/images/generations` | `gpt-image-2` |
| 图片编辑 | `POST /v1/images/edits` | 以分组实际模型为准 |

不要把真实 API Key 写进这个目录。
