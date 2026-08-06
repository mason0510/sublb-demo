# SubLB AI Agent 接入说明

这份文档给 Cursor、Claude Code、Codex、ChatGPT、其他 AI Agent 使用。

目标不是解释平台架构，而是让 AI 在用户说“帮我接入 SubLB API”时，能按稳定规则完成最小可运行接入。

---

## 1. 给 AI 的固定提示词

可以把下面这段直接复制给 AI：

```text
你正在帮助我接入 SubLB API。

请先阅读当前项目结构，找出已有的 HTTP 请求封装、环境变量配置、服务端入口和测试方式。

你的目标：
1. 用最小改动完成一个可运行的 SubLB API 调用。
2. 不要把真实 API Key 写入代码、README、日志、issue 或提交记录。
3. 不要猜测未验证的模型能力。
4. 不要一次同时修改 key、model、path、proxy、SDK 多个变量；排错时一次只改一个变量。
5. 先做最小 smoke test，再接入业务逻辑。

固定信息：
- Base URL: https://YOUR_SUBLB_DOMAIN
- OpenAI-compatible 认证：Authorization: Bearer <SUBLB_API_KEY>
- Gemini 原生接口认证：x-goog-api-key: <SUBLB_API_KEY>

完成后请输出：
- 修改了哪些文件
- 调用了哪个接口路径
- 使用了哪个模型
- 从哪个返回字段读取结果
- 如何在本地复测
- 是否存在未验证能力或风险
```

---

## 2. 固定事实

| 项目 | 值 |
|---|---|
| Base URL | `https://YOUR_SUBLB_DOMAIN` |
| 推荐环境变量 | `SUBLB_BASE_URL`、`SUBLB_API_KEY` |
| OpenAI-compatible 认证头 | `Authorization: Bearer <SUBLB_API_KEY>` |
| Gemini 原生认证头 | `x-goog-api-key: <SUBLB_API_KEY>` |
| 请求格式 | JSON，除图片编辑接口外 |
| 图片编辑 | `multipart/form-data` |

不要把真实 key 写进仓库。示例里只能使用：

```text
<SUBLB_API_KEY>
替换成你的 SubLB API Key
```

---

## 3. 接口选择规则

| 用户要做什么 | 优先接口 |
|---|---|
| GPT / Codex / DeepSeek 文本对话 | `POST /v1/chat/completions` |
| GPT / Codex / DeepSeek Responses 风格调用 | `POST /v1/responses` |
| Grok 文本对话 | `POST /v1/chat/completions` |
| Claude 文本对话 | `POST /v1/messages` |
| OpenAI / Grok 图片生成 | `POST /v1/images/generations` |
| OpenAI / Grok 图片编辑 | `POST /v1/images/edits` |
| Gemini 原生文本 / 图片 | `POST /v1beta/models/{model}:generateContent` |
| 查询模型列表 | `GET /v1/models`，只用于发现，不等于业务可用 |

关键边界：

- Claude 不要默认接到 `/v1/chat/completions`，优先使用 `/v1/messages`。
- Gemini 原生接口不要当成 OpenAI-compatible 接口。
- `/v1/models` 只能说明“看得到模型”，不能证明“业务接口可用”。

---

## 4. 推荐首测模型

| 类型 | 首测模型 |
|---|---|
| OpenAI / GPT / Codex 文本 | `gpt-5.5` |
| DeepSeek 文本 | `deepseek-v4-flash` |
| Grok 文本 | `grok-4.1-fast` |
| Claude 文本 | `claude-fable-5` |
| OpenAI 图片 | `gpt-image-2` |
| Grok 图片 | `grok-imagine-1.0` |

如果用户的 key 绑定了特定分组，以用户实际分组支持的模型为准。

---

## 5. 最小文本 smoke test

```bash
export SUBLB_BASE_URL="https://YOUR_SUBLB_DOMAIN"
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

## 6. 返回字段读取规则

| 接口 | 优先读取字段 |
|---|---|
| `/v1/chat/completions` | `choices[0].message.content` |
| `/v1/responses` | `output_text`，或 `output[].content[].text` |
| `/v1/messages` | `content[].text` |
| `/v1/images/generations` | `data[0].url` 或 `data[0].b64_json` |
| `/v1/images/edits` | `data[0].url` 或 `data[0].b64_json` |
| Gemini 原生 | `candidates[0].content.parts[].text` |

---

## 7. AI 接入步骤

1. 识别项目语言和框架，例如 Node.js、Go、Rust、Java、PHP。
2. 查找项目已有 HTTP client、SDK 封装、环境变量读取方式。
3. 新增或复用环境变量：`SUBLB_BASE_URL`、`SUBLB_API_KEY`。
4. 先写最小 smoke test，确认接口、模型、认证都正确。
5. 再把调用接入业务逻辑。
6. 加上基础错误处理：401、403、429、502、503。
7. 输出 readback：请求路径、模型、读取字段、本地复测命令。

---

## 8. 禁止事项

- 不要把真实 API Key、admin key、cookie、token 写入代码或文档。
- 不要在前端浏览器直接暴露 key，除非用户明确知道风险。
- 不要把 `/v1/models` 当成业务可用证明。
- 不要把 Claude 默认接到 `/v1/chat/completions`。
- 不要把 Gemini 原生接口当成 OpenAI-compatible。
- 不要一次同时更换 key、model、path、proxy、SDK。
- 不要把内部调试路径、临时测试证据、个人账号信息写进对外文档。

---

## 9. 排错顺序

| 现象 | 优先检查 |
|---|---|
| 401 / 403 | key 是否正确、是否带了 `Bearer`、是否用错认证头 |
| 404 | Base URL 和接口路径是否拼错 |
| 429 | 频率或额度限制，降低并发后重试 |
| 502 / 503 | 上游模型或分组暂不可用，换同分组已验证模型复测 |
| 返回为空 | 读取字段是否用错，例如 chat 和 messages 字段不同 |
| Gemini 不通 | 是否用了原生 `/v1beta/models/{model}:generateContent` 和 `x-goog-api-key` |

排错时一次只改一个变量。

---

## 10. 建议 AI 输出格式

AI 修改完项目后，建议按这个格式回复用户：

```text
已完成 SubLB API 接入。

修改文件：
- <file 1>
- <file 2>

本次调用：
- Base URL: https://YOUR_SUBLB_DOMAIN
- Path: <接口路径>
- Model: <模型名>
- 结果字段: <读取字段>

本地复测：
<命令或步骤>

注意：
- 未写入真实 API Key
- 未验证的模型没有声明为可用
```
