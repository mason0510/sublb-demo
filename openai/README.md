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

## Responses SSE 测试

`responses-sse.hurl` 用一个最小请求验证 `/v1/responses` 的流式返回：HTTP 200、
`text/event-stream`、业务文本 `SUBLB_SSE_OK` 和 Responses 专用结束事件
`response.completed` 都满足时才算通过。Responses SSE 不使用 Chat Completions 的 `[DONE]` 标记。

### 1. 准备本地变量文件

在当前目录创建 `.env.hurl`（该文件已被 `.gitignore` 忽略）：

```ini
sublb_base_url=https://YOUR_SUBLB_DOMAIN
sublb_api_key=YOUR_SUBLB_API_KEY
sublb_model=gpt-5.6-sol
```

`sublb_api_key` 只填 Key 本身，不要加 `Bearer`、引号或换行。模型应与 Key 所属分组一致；
Spark/OpenAI 分组可先使用 `gpt-5.6-sol`。

### 2. 执行测试

需要先安装 [Hurl](https://YOUR_SUBLB_DOMAIN/)，然后运行：

```bash
cd openai
hurl --test --variables-file .env.hurl responses-sse.hurl
```

成功时可看到 Hurl 的 `1 passed` 结果。失败时优先检查 Base URL、Bearer 认证头、Key 与模型分组，
不要把 `/v1/responses` 拼进 Base URL。
