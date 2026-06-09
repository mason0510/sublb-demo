# Customer Support Skill

适用场景：SubLB / Turing / turing-sdk 用户工单分诊、排障回复、错误码解释。

## 安全边界

- 永远不要要求用户公开粘贴完整 API Key、cookie、token。
- 如果用户已经贴了完整 key，先提示已识别到敏感信息，并在输出中脱敏。
- 只要求用户提供：错误码、request id、baseUrl、模型名、接口路径、脱敏 key 前后 4 位。

## 标准排障口径

- 405 Method Not Allowed：优先检查 baseUrl 和路径，尤其是是否应走 `/v1/chat/completions`，以及 `/v1` 是否重复或漏掉。
- 503 Service Unavailable：通常是上游账号、额度、调度或 key 侧不可用；不同 provider 的 key 不通用，需要换对应 provider key 做真实业务接口验收。
- 502 stream terminal event：优先切到 `chat_completions` / `openai_chat_completions`，先用非流式确认上游是否能完成。
- TUI 没进入交互界面：检查 wrapper 是否指向 direct REPL，用户期望 Turing Code TUI 时应走正式 `turing` CLI。

## 回复结构

1. 一句话确认问题。
2. 3-5 步排查。
3. 需要用户补充的信息，但不得索要完整密钥。
