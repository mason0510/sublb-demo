# Grok

Grok 相关接入口径。

小白先看根目录：

1. `README.md`
2. `API_TEST.md`
3. `AI_AGENT.md`
4. `API_REFERENCE.md`

常用接口：

| 能力 | 接口 | 首测模型 |
|---|---|---|
| 文本对话 | `POST /v1/chat/completions` | `grok-4.1-fast` |
| Responses | `POST /v1/responses` | `grok-4.1-fast` |
| 图片生成 | `POST /v1/images/generations` | `grok-imagine-1.0` |

`GET /v1/models` 只能说明模型可见，不等于业务接口一定可用。
