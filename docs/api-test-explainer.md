# SubLB API 测试解释说明

这份文档只解释概念，不放大量接口细节。

如果你只是想直接跑请求，看：[SubLB API 测试文档（Postman / Apifox 风格）](postman-apifox-api-test.md)。

---

## 1. 你拿到的 Key 是什么

SubLB API Key 可以理解成“某个后台分组的通行证”。

它决定：

- 你能用哪些模型；
- 你能调用哪些接口；
- 你有没有图片、Claude、Gemini 等能力；
- 额度、限速、计费怎么算。

所以不要把它理解成“一个 Key 能用所有平台”。

---

## 2. Base URL 是什么

Base URL 是所有接口的共同前缀：

```text
https://sub-lb.tap365.org
```

例如：

| 你要调用 | 完整 URL |
|---|---|
| 模型列表 | `https://sub-lb.tap365.org/v1/models` |
| 文本对话 | `https://sub-lb.tap365.org/v1/chat/completions` |
| 图片生成 | `https://sub-lb.tap365.org/v1/images/generations` |
| Claude | `https://sub-lb.tap365.org/v1/messages` |
| Gemini | `https://sub-lb.tap365.org/v1beta/models/{model}:generateContent` |

常见错误是把 `/v1` 多拼一遍，或者漏掉 `/v1`。

---

## 3. 什么是 OpenAI-compatible

OpenAI-compatible 的意思是：接口形状尽量兼容 OpenAI API。

常见接口：

| 接口 | 用途 |
|---|---|
| `/v1/chat/completions` | 文本对话 |
| `/v1/responses` | Responses 风格文本生成 |
| `/v1/models` | 查看模型列表 |
| `/v1/images/generations` | 图片生成 |
| `/v1/images/edits` | 图片编辑 |

OpenAI、DeepSeek、Grok 文本通常可以先从 `/v1/chat/completions` 测起。

---

## 4. 为什么 Claude 和 Gemini 不一样

不是所有平台都适合塞进同一个接口。

| 平台 | 推荐入口 | 原因 |
|---|---|---|
| Claude | `/v1/messages` | 更接近 Anthropic Messages 格式 |
| Gemini | `/v1beta/models/{model}:generateContent` | 更接近 Gemini 原生格式 |

所以：

- Claude Key 不要默认拿 `/v1/chat/completions` 测。
- Gemini Key 不要默认拿 OpenAI-compatible 图片/文本接口测。

---

## 5. 模型名应该怎么选

先按 Key 类型选一个最小模型测试：

| Key 类型 | 建议先试 |
|---|---|
| OpenAI / GPT / Codex 文本 | `gpt-5.5` |
| DeepSeek 文本 | `deepseek-v4-flash` |
| Grok 文本 | `grok-4.1-fast` |
| Claude | `claude-fable-5` |
| OpenAI 图片 | `gpt-image-2` |
| Grok 图片 | `grok-imagine-1.0` |

如果不确定模型名，先请求 `/v1/models` 看当前 Key 可见模型。

注意：模型可见不等于业务接口一定可用。最终还是要跑对应接口。

---

## 6. 返回结果应该读哪里

不同接口返回字段不一样：

| 接口 | 读取字段 |
|---|---|
| `/v1/chat/completions` | `choices[0].message.content` |
| `/v1/responses` | `output_text` 或 `output[].content[].text` |
| `/v1/messages` | `content[].text` |
| `/v1/images/generations` | `data[0].url` 或 `data[0].b64_json` |
| `/v1/images/edits` | `data[0].url` 或 `data[0].b64_json` |
| Gemini `generateContent` | `candidates[0].content.parts[].text` |

小白最容易卡在“请求成功了，但不知道读哪个字段”。优先看这张表。

---

## 7. Postman / Apifox 应该怎么建集合

建议按能力分组，不按模型名分组：

```text
SubLB API
├── 00 环境与认证
├── 01 模型列表
├── 02 文本 Chat Completions
├── 03 文本 Responses
├── 04 Claude Messages
├── 05 图片生成
├── 06 图片编辑
├── 07 Gemini 原生 generateContent
└── 99 错误排查
```

这样小白不会被几十个模型名吓住，只要先选自己手上 Key 对应的能力。

---

## 8. README、测试文档、API Reference 的分工

| 文件 | 作用 | 不应该放什么 |
|---|---|---|
| `README.md` | 项目入口，告诉用户先看哪份文档 | 不放长模型表、不放历史测试细节 |
| `docs/postman-apifox-api-test.md` | 按 Postman / Apifox 风格跑接口 | 不解释太多平台背景 |
| `docs/api-test-explainer.md` | 解释 Key、分组、模型、返回字段 | 不堆完整 API 参数 |
| `sublb_grok_openai_gemini_claude_deepseek_API文档.md` | 高级 API Reference | 不作为小白第一入口 |

---

## 9. 最小排错思路

先按这个顺序排查：

```text
1. Base URL 是否正确
2. Header 认证是否正确
3. Key 是否属于这个分组
4. model 是否属于这个 Key
5. 接口路径是否对应平台
6. 额度是否用完
7. 上游账号是否暂不可用
```

不要一看到失败就同时换 Key、换模型、换接口、换代理。一次只改一个变量，才知道问题在哪。

