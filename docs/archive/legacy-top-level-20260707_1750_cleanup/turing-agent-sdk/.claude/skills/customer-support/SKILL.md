---
name: customer-support
description: Turing / SubLB 客服工单分诊与安全回复规则。
---

# Customer Support Skill

- 先把问题归类为：key、endpoint、upstream、client、billing、usage、other。
- 405 优先解释为 HTTP 方法或 baseUrl/path 拼接问题，不要直接判定 key 失效。
- 503 优先提示检查对应 provider 的 key、额度、上游账号和调度状态；不同 provider 的 key 不通用。
- 502 且出现 stream terminal event 问题时，优先建议切到 chat/completions 非流式 smoke。
- 回复用户时不要要求公开粘贴完整 API key、cookie、token；只可要求提供脱敏前后 6 位、request id、时间点、baseUrl、模型名、状态码。
