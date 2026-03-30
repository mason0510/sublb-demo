# Sublb Grok 与 OpenAI 对外 API 公告（展示有效 3 天）

公告日期：2026-04-26  
公告版本：v1.1  
展示有效期：自发布起 3 天内有效

当前对外可展示的 API 能力如下：

- OpenAI 文本接口可用：`/v1/chat/completions`、`/v1/responses`
- Grok 文本接口可用：`/v1/chat/completions`、`/v1/responses`
- Grok 图片接口可用：`POST /v1/images/generations`

统一 Base URL：

```text
https://sub-lb.tap365.org
```

当前图片与视频口径：

1. `gpt-image-2` 的对外默认分组口径仍是 `pro`，但本轮公网 `POST /v1/images/generations` 连续 3 次返回 `502 origin_bad_gateway`，**当前不可对外承诺可用**
2. `grok-imagine-1.0` 的对外默认分组口径仍是 `grok图片`，且本轮公网 `POST /v1/images/generations` 已实测 `200` 可生图
3. 追加实测事实：用户自备的 `grok图文` key 也已成功调用 `grok-imagine-1.0`
4. 视频源码路由存在 `GET /sora/v1/models`、`POST /sora/v1/chat/completions`，但当前公网分别返回 HTML 壳与 `405`，**当前不可对外承诺可用**

使用说明：

1. `/v1/models` 仅供参考，是否可用以真实业务请求结果为准
2. 默认分组口径与技术实测边界要分开理解，不要把“个别 key 实测可调通”误写成“默认分组已变更”
3. 当前公告仅用于展示期说明，不构成长期 SLA 承诺
4. 展示期结束后，请以当时实际路由与业务实测结果为准
5. 公告与文档均不提供真实 Key

如需接入说明，请查看：

- [Sublb生图对外API文档.md](./Sublb生图对外API文档.md)
