# sublb-demo QA 常见问题与错误码说明

> 最后整理：2026-03-30  
> 适用范围：`https://sub-lb.tap365.org` 及同类 sublb 网关的 OpenAI-compatible 调用。  
> 目的：让最终用户和接入方看到报错后，能直接判断 **是 key、订阅、限流、模型路由，还是上游临时异常**。  
> 说明：
> - 本文同时包含 **服务端已定义错误码** 与 **高频上游错误**。
> - 服务端错误码来自当前仓库 `feature-log/backend` 中已定义的错误常量与 HTTP 映射。
> - 上游错误不一定有我们自定义 `reason`，但用户经常会看到，QA 文档必须单独解释。

---

## 文档导航

- [第三方客户端问题汇总.md](第三方客户端问题汇总.md)：专门看 OpenClaw、Codex CLI、curl、Python/OpenAI SDK 的问题。

## 1. 先看 3 条最重要结论

### 1.1 `/v1/models` 返回 200，不等于所有模型都能调用

它只说明：

- 域名通
- key 认证通过
- 当前 key 能看到一组模型

它**不说明**：

- 所有模型都稳定可用
- 所有模型都能返回 200
- 某个指定模型一定不会 502 / 超时 / TLS 失败

### 1.2 报错先分 3 类

1. **我们服务器自己的错误码**：通常 JSON 里会有 `reason`
2. **我们服务器转译后的通用错误**：例如 `billing_error`、`rate_limit_exceeded`
3. **上游原始错误**：例如 OpenAI 的 429、SSE 流中断、502、TLS 握手失败

### 1.3 正确排障顺序

先测：

```bash
curl -sS -H "Authorization: Bearer $SUBLB_API_KEY" \
  "$SUBLB_BASE_URL/v1/models"
```

再测：

```bash
curl -sS \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"model":"gpt-5.4","input":"Reply with exactly pong and nothing else."}' \
  "$SUBLB_BASE_URL/v1/responses"
```

不要一上来就先怀疑 SDK、OpenClaw、Codex CLI。

---

## 2. 高优先级 FAQ：用户最常遇到的错误

## 2.1 `SUBSCRIPTION_NOT_FOUND`

### 用户看到什么

```json
{
  "code": 404,
  "reason": "SUBSCRIPTION_NOT_FOUND",
  "message": "subscription not found"
}
```

### 这代表什么

> 当前 key 对应 group 没有有效订阅。

### 常见原因

- key 对应 group 没有套餐
- 订阅过期
- 订阅被暂停
- 你用错 group / 用错 key

### 怎么解决

1. 换一把已确认有有效订阅的 key
2. 检查该 key 绑定的 group 是否就是你要调用的 group
3. 如果你有后台权限，检查 `subscription_status` 和 `expires_at`

---

## 2.2 `API_KEY_RATE_5H_EXCEEDED` / `API_KEY_RATE_1D_EXCEEDED` / `API_KEY_RATE_7D_EXCEEDED`

### 用户看到什么

可能是：

```json
{
  "code": 429,
  "reason": "API_KEY_RATE_5H_EXCEEDED",
  "message": "api key 5小时限额已用完"
}
```

或者网关转成更通用的：

```json
{
  "code": 429,
  "reason": "rate_limit_exceeded",
  "message": "..."
}
```

### 这代表什么

> 这是 **我们服务器自己的 key 配额 / 时间窗限流**，不是 OpenAI 官方 429。

### 怎么解决

- 等待时间窗自动恢复
- 换另一把 key
- 升级更高配额的订阅/分组

---

## 2.3 `exceeded retry limit, last status: 429 Too Many Requests, request ...`

### 这是什么

这是 **OpenAI 上游的 429 报错**，不是我们服务器自定义错误码。

### 这代表什么

> 上游认为你的请求速率过快，或者短时间内重试过多。

### 正确处理

- **等待几分钟再试**
- 不要立刻高频重试
- 如果你在脚本里写了自动重试，先把重试频率降下来
- 如果是批量任务，做并发控制和退避重试（backoff）

### 不要误判成什么

- 不是 key 一定失效
- 不是域名一定挂了
- 不是一定要立刻换客户端

一句话：

> **这个报错的第一处理动作就是“降速 + 等几分钟”。**

---

## 2.4 `error code: 502`

### 这代表什么

> 请求已经进了 sublb，但目标模型这条实际转发链路失败了。

### 常见原因

- 目标模型当前上游不可用
- 该模型虽然在 `/v1/models` 中可见，但路由不稳定
- 上游瞬时错误，最终由网关对外表现成 502

### 怎么解决

1. 先换到已知可用模型测试，例如 `gpt-5.4`
2. 如果 `gpt-5.4` 正常，但你的目标模型一直 502，按**模型粒度问题**处理
3. 如果所有模型都 502，再怀疑整体网关或上游故障

---

## 2.5 `curl_exit=28`

### 这代表什么

> 请求超时。

### 常见原因

- 上游卡住
- 当前模型响应特别慢
- 本地到网关链路不稳定

### 怎么解决

- 先单独测试一个已知可用模型
- 增大 `--max-time`
- 不要把个别模型超时误判成“整个站点不可用”

---

## 2.6 `curl_exit=35`

### 这代表什么

> TLS / SSL 握手失败。

### 常见原因

- TLS 握手异常
- 某条上游连接建立阶段出问题
- 中间网络层干扰

### 怎么解决

- 换网络或环境重测
- 先测试另一个稳定模型
- 如果只在少数模型上出现，优先按上游链路问题处理

---

## 2.7 `stream disconnected before completion`

### 这代表什么

> `/v1/responses` 的流式输出开始了，但没有按客户端预期正常收尾。

### 常见原因

- SSE 终止事件不完整
- 代理链路中途断开
- 客户端期待 `response.completed`，但实际上没等到完整结束事件

### 怎么解决

- 先用最小请求复测
- 先看网关原始 `/v1/responses` 行为，再看客户端
- 不要一上来就先改 Codex / OpenClaw 配置

---

## 3. 服务端错误码总览（用户侧最相关）

下面这部分是 **我们服务器已定义的主要错误码**。  
格式说明：

- **HTTP**：HTTP 状态码
- **错误码**：返回体里的 `reason`
- **含义**：用户该怎么理解
- **建议动作**：用户应该先做什么

---

## 3.1 认证与登录类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 401 | `INVALID_CREDENTIALS` | 邮箱或密码错误 | 重新确认账号密码 |
| 401 | `INVALID_TOKEN` | token 无效 | 重新登录获取新 token |
| 401 | `TOKEN_EXPIRED` | access token 已过期 | 重新登录或刷新 token |
| 401 | `TOKEN_REVOKED` | token 已被撤销 | 重新登录 |
| 401 | `ACCESS_TOKEN_EXPIRED` | access token 过期 | 重新登录 |
| 401 | `REFRESH_TOKEN_INVALID` | refresh token 无效 | 重新登录 |
| 401 | `REFRESH_TOKEN_EXPIRED` | refresh token 过期 | 重新登录 |
| 401 | `REFRESH_TOKEN_REUSED` | refresh token 已被复用 | 重新登录，排查多端并发 |
| 403 | `USER_NOT_ACTIVE` | 用户已被禁用或未激活 | 联系管理员 |
| 403 | `REGISTRATION_DISABLED` | 注册关闭 | 等管理员开放注册 |
| 403 | `PASSWORD_RESET_DISABLED` | 忘记密码功能未开启 | 联系管理员 |
| 400 | `INVALID_EMAIL` | 邮箱格式不合法 | 改成合法邮箱 |
| 400 | `EMAIL_RESERVED` | 邮箱属于保留地址 | 更换邮箱 |
| 400 | `EMAIL_SUFFIX_NOT_ALLOWED` | 邮箱后缀不在白名单 | 改用允许的邮箱后缀 |
| 400 | `EMAIL_VERIFY_REQUIRED` | 注册必须先完成邮箱验证 | 先完成验证码验证 |
| 400 | `INVALID_VERIFY_CODE` | 验证码无效或过期 | 重新获取验证码 |
| 429 | `VERIFY_CODE_TOO_FREQUENT` | 验证码发送太频繁 | 等待一会再发 |
| 429 | `VERIFY_CODE_MAX_ATTEMPTS` | 验证失败次数过多 | 重新申请新验证码 |

---

## 3.2 邀请与注册门槛类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 400 | `INVITATION_CODE_REQUIRED` | 注册必须填写邀请码 | 补填邀请码 |
| 400 | `INVITATION_CODE_INVALID` | 邀请码无效或已被用掉 | 更换有效邀请码 |
| 403 | `OAUTH_INVITATION_REQUIRED` | OAuth 注册也必须邀请码 | 补填邀请码后重试 |
| 400 | `INVITE_CODE_NOT_FOUND` | 邀请绑定码不存在 | 检查链接参数是否完整 |
| 400 | `INVITE_SELF_NOT_ALLOWED` | 不能绑定自己的邀请码 | 改用他人的邀请码 |
| 400 | `INVITE_LOOP_DETECTED` | 发现邀请关系环 | 检查邀请关系数据 |
| 400 | `INVITE_ALREADY_BOUND` | 邀请关系已绑定 | 同一账号不要重复绑定 |
| 429 | `INVITE_IP_LIMIT_EXCEEDED` | 同一 IP 邀请绑定过于频繁 | 等待后再试，或换网络 |

---

## 3.3 API Key / 网关准入类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 404 | `API_KEY_NOT_FOUND` | key 不存在 | 检查 key 是否填错 |
| 401 | `API_KEY_INACTIVE` | key 已停用 | 换 active key |
| 403 | `API_KEY_EXPIRED` | key 已过期 | 续期或换新 key |
| 403 | `GROUP_NOT_ALLOWED` | 当前用户不能绑定这个 group | 换允许的 group/key |
| 429 | `API_KEY_RATE_LIMITED` | key 触发短期限流 | 稍后重试 |
| 429 | `API_KEY_QUOTA_EXHAUSTED` | key 总额度已耗尽 | 升级额度或换 key |
| 429 | `API_KEY_RATE_5H_EXCEEDED` | key 5 小时额度用完 | 等窗口恢复 |
| 429 | `API_KEY_RATE_1D_EXCEEDED` | key 日额度用完 | 次日再试或换 key |
| 429 | `API_KEY_RATE_7D_EXCEEDED` | key 7 天额度用完 | 等窗口恢复或换 key |
| 400 | `API_KEY_TOO_SHORT` | key 长度不合法 | 使用完整 key |
| 400 | `API_KEY_INVALID_CHARS` | key 包含非法字符 | 检查复制是否多空格/换行 |
| 400 | `INVALID_IP_PATTERN` | IP 白名单规则非法 | 修正 IP / CIDR 配置 |

---

## 3.4 订阅 / 配额 / 套餐类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 404 | `SUBSCRIPTION_NOT_FOUND` | 没有找到有效订阅 | 检查 key 对应 group 的订阅 |
| 403 | `SUBSCRIPTION_EXPIRED` | 订阅已过期 | 续费 |
| 403 | `SUBSCRIPTION_SUSPENDED` | 订阅已暂停 | 联系管理员 |
| 403 | `SUBSCRIPTION_INVALID` | 订阅无效或过期 | 检查套餐状态 |
| 400 | `SUBSCRIPTION_REQUIRED` | 当前 group 必须有有效订阅才能用 | 先开通订阅 |
| 429 | `DAILY_LIMIT_EXCEEDED` | 日额度超限 | 次日再试 |
| 429 | `WEEKLY_LIMIT_EXCEEDED` | 周额度超限 | 等窗口恢复 |
| 429 | `MONTHLY_LIMIT_EXCEEDED` | 月额度超限 | 下月恢复或升级套餐 |
| 400 | `GROUP_NOT_SUBSCRIPTION_TYPE` | 当前 group 不是订阅型 group | 换正确 group |
| 400 | `ADJUST_WOULD_EXPIRE` | 调整后订阅会立刻过期 | 减少缩短量 |
| 400 | `CANNOT_SHORTEN_EXPIRED` | 已过期订阅不能再缩短 | 先恢复或新开通 |

---

## 3.5 支付与兑换类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 400 | `PAYMENT_CREATE_INPUT_REQUIRED` | 创建订单缺参数 | 检查请求体 |
| 400 | `PAYMENT_BIZ_TYPE_UNSUPPORTED` | 不支持的支付业务类型 | 检查支付场景参数 |
| 400 | `PAYMENT_AMOUNT_INVALID` | 金额非法 | 检查金额是否大于 0 |
| 400 | `PAYMENT_USER_ID_INVALID` | 用户 ID 非法 | 检查登录态或请求参数 |
| 400 | `INSUFFICIENT_BALANCE` | 余额不足 | 充值或换支付方式 |
| 404 | `REDEEM_CODE_NOT_FOUND` | 兑换码不存在 | 检查兑换码 |
| 400 | `REDEEM_CODE_INVALID` | 兑换码不合法或缺少关联订阅组 | 更换有效兑换码 |
| 429 | `REDEEM_RATE_LIMITED` | 兑换失败次数过多 | 稍后再试 |
| 404 | `PROMO_CODE_NOT_FOUND` | 优惠码不存在 | 检查优惠码 |
| 400 | `PROMO_CODE_EXPIRED` | 优惠码已过期 | 换新优惠码 |
| 400 | `PROMO_CODE_DISABLED` | 优惠码已停用 | 换码 |
| 400 | `PROMO_CODE_MAX_USED` | 优惠码已达使用上限 | 换码 |
| 400 | `PROMO_CODE_INVALID` | 优惠码无效 | 检查输入 |

---

## 3.6 权限与用户资源类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 404 | `USER_NOT_FOUND` | 用户不存在 | 检查登录用户或用户 ID |
| 403 | `INSUFFICIENT_PERMISSIONS` | 权限不足 | 换管理员或更高权限账号 |
| 404 | `USER_ASSET_NOT_FOUND` | 用户资产不存在 | 联系管理员检查资产记录 |
| 400 | `PASSWORD_INCORRECT` | 当前密码不对 | 输入正确旧密码 |

---

## 3.7 TOTP / 二次验证类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 400 | `TOTP_NOT_ENABLED` | 系统未开启 TOTP 功能 | 联系管理员 |
| 400 | `TOTP_NOT_SETUP` | 当前账号未配置 TOTP | 先完成绑定 |
| 400 | `TOTP_ALREADY_ENABLED` | 当前账号已经启用 TOTP | 不要重复启用 |
| 400 | `TOTP_INVALID_CODE` | TOTP 验证码不正确 | 重新输入 |
| 400 | `TOTP_SETUP_EXPIRED` | TOTP 设置会话过期 | 重新开始绑定流程 |
| 429 | `TOTP_TOO_MANY_ATTEMPTS` | 验证尝试过多 | 等待后再试 |
| 400 | `PASSWORD_REQUIRED` | 必须提供密码 | 补填密码 |
| 400 | `VERIFY_CODE_REQUIRED` | 必须提供邮箱验证码 | 补填验证码 |

---

## 3.8 Turnstile / 人机验证类

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 400 | `TURNSTILE_VERIFICATION_FAILED` | 人机验证失败 | 刷新页面重新验证 |
| 400 | `TURNSTILE_INVALID_SECRET_KEY` | 服务器 Turnstile 配置有误 | 联系管理员，不是用户输入问题 |

---

## 3.9 OpenAI OAuth / Sora OAuth 类

这一组更多是后台对接或 OAuth 接入时会看到的错误，但这里也列出来，方便 QA 快速定位。

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 400 | `OPENAI_OAUTH_INVALID_STATE` | OAuth state 无效 | 从登录入口重新发起授权 |
| 400 | `OPENAI_OAUTH_STATE_REQUIRED` | 缺少 state | 走完整 OAuth 流程 |
| 400 | `OPENAI_OAUTH_SESSION_NOT_FOUND` | 会话不存在或已过期 | 重新开始授权 |
| 400 | `OPENAI_OAUTH_INVALID_ACCOUNT` | 账号不是 OpenAI/Sora 账号 | 检查账号类型 |
| 400 | `OPENAI_OAUTH_INVALID_ACCOUNT_TYPE` | 账号不是 OAuth 类型 | 重新选择正确账号 |
| 400 | `OPENAI_OAUTH_NO_REFRESH_TOKEN` | 没拿到 refresh token | 重新授权 |
| 400 | `SORA_SESSION_TOKEN_REQUIRED` | 缺少 session_token | 补传 session token |
| 502 | `OPENAI_OAUTH_REQUEST_FAILED` | 上游 OAuth 请求失败 | 稍后再试 |
| 502 | `OPENAI_OAUTH_TOKEN_EXCHANGE_FAILED` | token 交换失败 | 稍后重试或重新授权 |
| 502 | `OPENAI_OAUTH_TOKEN_REFRESH_FAILED` | token 刷新失败 | 重新授权 |
| 502 | `SORA_SESSION_REQUEST_FAILED` | Sora session 请求失败 | 稍后重试 |
| 502 | `SORA_SESSION_EXCHANGE_FAILED` | Sora session 交换失败 | 稍后重试 |
| 502 | `SORA_SESSION_PARSE_FAILED` | Sora session 返回体无法解析 | 联系管理员 |
| 502 | `SORA_SESSION_ACCESS_TOKEN_MISSING` | 上游返回缺少 access token | 重新授权或联系管理员 |

---

## 3.10 网关计费转译错误

除了上面的业务 `reason`，网关还会对部分计费错误转译成更通用的错误码：

| HTTP | 错误码 | 含义 | 建议动作 |
|---|---|---|---|
| 503 | `billing_service_error` | 计费服务暂时不可用 | 稍后重试 |
| 429 | `rate_limit_exceeded` | key 命中服务器侧时间窗限流 | 等待时间窗恢复 |
| 403 | `billing_error` | 计费检查失败，但不是服务完全不可用 | 查看 message，再检查订阅/配额 |

---

## 4. 用户拿到报错后，最短决策树

## 4.1 先看有没有 `reason`

### 如果有 `reason`

按本文第 3 节直接查表。

### 如果没有 `reason`

通常是这三类：

1. 上游原始错误
2. 代理链路错误
3. 客户端本地错误

优先看是否属于：

- `429 Too Many Requests`
- `502`
- `curl_exit=28`
- `curl_exit=35`
- `stream disconnected before completion`

---

## 4.2 如果是 429，先分清谁的 429

### 我们服务器自己的 429

常见 `reason`：

- `API_KEY_RATE_5H_EXCEEDED`
- `API_KEY_RATE_1D_EXCEEDED`
- `API_KEY_RATE_7D_EXCEEDED`
- `API_KEY_QUOTA_EXHAUSTED`
- `DAILY_LIMIT_EXCEEDED`
- `WEEKLY_LIMIT_EXCEEDED`
- `MONTHLY_LIMIT_EXCEEDED`
- `rate_limit_exceeded`

处理：**等时间窗 / 换 key / 升级配额**。

### OpenAI 上游的 429

典型文案：

```text
exceeded retry limit, last status: 429 Too Many Requests, request ...
```

处理：**请求速率过快，等待几分钟即可，不要继续高频撞。**

---

## 4.3 如果是 403，最常见不是“站点挂了”

先按下面顺序想：

1. `SUBSCRIPTION_NOT_FOUND`？
2. `SUBSCRIPTION_EXPIRED` / `SUBSCRIPTION_SUSPENDED`？
3. `API_KEY_EXPIRED`？
4. `GROUP_NOT_ALLOWED`？
5. `USER_NOT_ACTIVE`？

也就是说：

> **403 在这个系统里，优先查订阅、key、group、用户状态。**

---

## 4.4 如果 `/v1/models` 能通，但模型调用失败

这通常不是认证问题，而是：

- 模型路由问题
- 上游问题
- 指定模型当前不可用

处理顺序：

1. 先测 `gpt-5.4`
2. 再测目标模型
3. `gpt-5.4` 成功但目标模型失败 → 按模型粒度问题处理

---

## 5. 给最终用户的一句话版说明

你可以直接把下面这段发给用户：

> 如果你看到 `SUBSCRIPTION_NOT_FOUND`，说明当前 key 对应 group 没有效订阅。  
> 如果你看到 `API_KEY_RATE_*_EXCEEDED` 或 `rate_limit_exceeded`，说明命中了我们服务器自己的限流窗口。  
> 如果你看到 `exceeded retry limit, last status: 429 Too Many Requests`，这是 OpenAI 上游限流，先等几分钟再试。  
> 如果 `/v1/models` 是 200，但某个模型调用报 502、超时或 TLS 错误，这通常是该模型自己的路由/上游问题，不代表整个网关挂了。

---

## 6. 最后收口

### 你必须记住这 5 句话

1. **先看 `reason`，有 `reason` 先按我们服务器错误码查。**
2. **`SUBSCRIPTION_NOT_FOUND` 先查订阅，不要先怪客户端。**
3. **`API_KEY_RATE_*` 是我们服务器限流，`429 Too Many Requests` 那句常常是 OpenAI 上游限流。**
4. **OpenAI 的 `exceeded retry limit, last status: 429 ...`，请求速率过快，等待几分钟即可。**
5. **`/v1/models` = 200 不等于所有模型都可用。**
