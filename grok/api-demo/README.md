# tap365 / Grok 4.6 API 验证 Demo

这个 Demo 用于用户自行验证 `Responses API` 的基础请求、SSE、工具数量、多轮
`function_call` 历史，以及 8K/16K/32K `instructions`。请求只读，不执行工具调用，
不会写入远端资源。

## 1. 设置自己的 API Key

API Key 只从环境变量读取，不要写入代码、命令历史或提交记录：

```bash
export TAP365_API_KEY='YOUR_API_KEY'
export TAP365_BASE_URL='https://chainfuel.tap365.org'
export TAP365_MODEL='grok-4.6'
```

## 2. 编译并运行

在 Demo 目录执行：

```bash
cd /Users/houzi/code/06-production-business-money-live/sublb-demo/grok/api-demo
export TAP365_API_KEY='YOUR_API_KEY'
go run ./tap365_responses_probe.go
```

也可以编译后运行：

```bash
cd /Users/houzi/code/06-production-business-money-live/sublb-demo/grok/api-demo
go build -o /tmp/tap365-responses-probe ./tap365_responses_probe.go
/tmp/tap365-responses-probe
```

每行输出一个 JSON 结果。重点查看：

- `HTTPCode: 200`
- `StreamComplete: true`
- `RayID`：失败时提供给服务端查询
- `RequestBytes`：请求体字节数，不是 token 数

## 3. 单独验证某一项

```bash
TAP365_CASE=responses_instructions_8k go run ./tap365_responses_probe.go
TAP365_CASE=responses_instructions_16k go run ./tap365_responses_probe.go
TAP365_CASE=responses_instructions_32k go run ./tap365_responses_probe.go
TAP365_CASE=responses_tools_20 go run ./tap365_responses_probe.go
TAP365_CASE=responses_function_history go run ./tap365_responses_probe.go
```

## 4. 结果判定

正常：

```text
HTTPCode = 200
StreamComplete = true
```

失败时记录完整 JSON，尤其是 `HTTPCode`、`Detail`、`RayID`、`RequestBytes`，
不要反复重试同一失败请求。工具名称必须唯一；重复工具名会导致上游结构化
请求错误，不宜作为 `instructions` 长度限制的证据。

## 5. 代理说明

Go 客户端遵循系统代理环境变量。若系统设置了 `NO_PROXY=.tap365.org`，
对 `chainfuel.tap365.org` 会直接连接，不经过本地代理。可用下面命令确认：

```bash
env | grep -iE '^(http|https|all|no)_proxy='
```

## 6. 安全提示

测试结束后清除当前 shell 中的 Key：

```bash
unset TAP365_API_KEY
```
