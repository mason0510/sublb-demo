# Sublb Grok 与 OpenAI 对外 API 文档

测试日期：2026-04-26  
文档版本：v2.1

## 1. 文档目的

本文档面向外部接入方，说明当前 `https://sub-lb.tap365.org` 上 **OpenAI / Grok 对外 API** 的公开入口、认证方式、已实测通过的业务接口、图片分组映射，以及视频接口的当前公网边界。

本文档只写两类事实：

1. **2026-04-26 当次真实业务实测结果**
2. **源码已确认、但公网入口当前未打通的边界**

---

## 2. 基础信息

- Base URL：`https://sub-lb.tap365.org`
- 推荐主路径：统一优先使用带 `/v1` 的路径
- 认证方式：`Authorization: Bearer <YOUR_API_KEY>`
- 文档中**不提供任何真实 Key**

### 2.1 当前源码已确认的公开路由

基于 `sublb/main/backend/internal/server/routes/gateway.go`，当前源码已注册：

#### OpenAI / Grok 公共路由

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/images/generations`

#### 不带 `/v1` 的别名

- `POST /chat/completions`
- `POST /responses`
- `POST /images/generations`

> 对外文档默认只推荐 `/v1/*`，不要把别名路径当主接入路径。

#### 视频相关源码路由

- `GET /sora/v1/models`
- `POST /sora/v1/chat/completions`

> 注意：源码里**没有**普通 OpenAI 风格的 `POST /v1/videos/generations`。

---

## 3. 当前实测结论总览

| 能力 | 路径 | 模型/分组 | 本轮结果 | 结论 |
|---|---|---|---|---|
| OpenAI 文本模型枚举 | `GET /v1/models` | OpenAI key | `200`，返回 `gpt-5.5` | 可用 |
| OpenAI 文本对话 | `POST /v1/chat/completions` | `gpt-5.5` | `200`，返回 `OK-OPENAI` | 可用 |
| OpenAI Responses | `POST /v1/responses` | `gpt-5.5` | `200`，`status=completed` | 可用 |
| OpenAI 生图 | `POST /v1/images/generations` | `gpt-image-2` / `pro` | 连续 3 次 `502 origin_bad_gateway` | 当前不可用 |
| Grok 模型枚举 | `GET /v1/models` | Grok图文 key | `200`，返回 `grok-4.1-fast`、`grok-imagine-1.0`、`grok-imagine-1.0-fast` | 可用 |
| Grok 文本对话 | `POST /v1/chat/completions` | `grok-4.1-fast` | `200`，返回 `OK-GROK-TUWEN` | 可用 |
| Grok Responses | `POST /v1/responses` | `grok-4.1-fast` | `200`，`status=completed`，返回 `OK-GROK-TUWEN-RESPONSES` | 可用 |
| Grok 生图 | `POST /v1/images/generations` | `grok-imagine-1.0` / 默认 `grok图片` | `200`，Grok图文 key 也已返回图片 URL 并成功下载 | 可用 |
| 公网视频模型列表 | `GET /sora/v1/models` | Grok 图文 key | `200`，但返回前端 HTML 壳 | 当前公网不可用 |
| 公网视频生成 | `POST /sora/v1/chat/completions` | `sora2-landscape-10s` | `405`，`Allow: GET, HEAD` | 当前公网不可用 |

---

## 4. 模型与分组映射

### 4.1 图片分组映射

| 模型 | 对外默认应选分组 | 本轮公网实测 |
|---|---|---|
| `gpt-image-2` | `pro` | 当前 `502 origin_bad_gateway` |
| `grok-imagine-1.0` | `grok图片` | `200` 可生图，且 Grok图文 key 也已调通 |

### 4.2 重要说明

1. `gpt-image-2 -> pro` 是**分组映射规则**，不等于当前公网一定可用。  
2. `GET /v1/models` 只可用于确认“当前 key 能看到哪些模型”，**不能替代图片业务验收**。  
3. 当前 OpenAI key 的 `/v1/models` 只返回 `gpt-5.5`，但这不代表 `gpt-image-2` 映射不存在；只是说明模型列表**不能作为图片是否可用的充分条件**。  
4. 当前 Grok图文 key 的 `/v1/models` 已返回 `grok-imagine-1.0`，且 `POST /v1/images/generations` 业务实测通过。  
5. 对外默认分组口径仍应写：`grok-imagine-1.0 -> grok图片`；本轮新增事实只是说明**技术上 Grok图文 key 也可成功调用该模型**。

---

## 5. 认证方式

所有接口统一使用：

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

示例：

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/models \
  -H "Authorization: Bearer <YOUR_API_KEY>"
```

> 本文档保留 `--noproxy '*'`，是为了避免本地代理链路造成假阴性。你自己的环境如果没有代理干扰，可以去掉。

---

## 6. 文本接口

### 6.1 `GET /v1/models`

**完整 URL**

```text
https://sub-lb.tap365.org/v1/models
```

**OpenAI key 本轮返回模型**

- `gpt-5.5`

**Grok图文 key 本轮返回模型**

- `grok-4.1-fast`
- `grok-imagine-1.0`
- `grok-imagine-1.0-fast`

### 6.2 `POST /v1/chat/completions`

**OpenAI 文本示例**

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "messages": [
      {"role": "user", "content": "请只回复 OK"}
    ],
    "stream": false
  }'
```

**Grok 文本示例**

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4.1-fast",
    "messages": [
      {"role": "user", "content": "请只回复 OK"}
    ],
    "stream": false
  }'
```

### 6.3 `POST /v1/responses`

**OpenAI Responses 示例**

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/responses \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-5.5",
    "input": "请只回复 OK",
    "stream": false
  }'
```

**Grok Responses 示例**

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/responses \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4.1-fast",
    "input": "请只回复 OK",
    "stream": false
  }'
```

---

## 7. 图片接口

### 7.1 `POST /v1/images/generations`

**完整 URL**

```text
https://sub-lb.tap365.org/v1/images/generations
```

**通用请求体字段**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | 是 | `gpt-image-2` 或 `grok-imagine-1.0` |
| `prompt` | string | 是 | 提示词 |
| `size` | string | 否 | 示例：`1024x1024` |
| `n` | number | 否 | 建议先用 `1` |

### 7.2 `gpt-image-2` 示例（对应 `pro` 分组）

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/images/generations \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "生成一张白底、蓝色玻璃质感字母 O 图标。",
    "size": "1024x1024",
    "n": 1
  }'
```

**本轮公网实测结果**

- 第 1 次：`502 origin_bad_gateway`
- 第 2 次：`502 origin_bad_gateway`
- 第 3 次：`502 origin_bad_gateway`

结论：

- `gpt-image-2` 与 `pro` 的分组映射仍应按既定口径接入
- 但 **2026-04-26 当次公网业务实测未通过**
- 当前不应把它对外宣传为“稳定可生图”

### 7.3 `grok-imagine-1.0` 示例（对外默认对应 `grok图片` 分组）

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/images/generations \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-1.0",
    "prompt": "生成一张白底、黑金质感字母 G 图标。",
    "size": "1024x1024",
    "n": 1
  }'
```

**本轮公网实测结果**

- `200 OK`
- 返回体里是 `data[0].url`
- 已成功下载图片到本地产物
- 本轮成功样本使用的是 `sub-lb.tap365.org/grok图文/SK(脱敏)`

结论：

- 当前 `grok-imagine-1.0` 可直接对外写为可用
- 默认分组口径仍应写 `grok图片`
- 追加技术实测事实：用户提供的 `grok图文` key 也已成功调通 `grok-imagine-1.0`

### 7.4 图片返回形态差异

当前实测到两种真实返回：

| 模型 | 成功返回形态 | 当前状态 |
|---|---|---|
| `gpt-image-2` | 预期兼容 `data[].b64_json` | 本轮未成功拿到 200 |
| `grok-imagine-1.0` | `data[].url` | 已实测 200 |

接入方不要只写死一种解析方式。建议同时兼容：

- `b64_json`
- `url`

---

## 8. 视频能力边界

### 8.1 源码确认的设计口径

当前视频不是普通 OpenAI 风格：

- **没有** `POST /v1/videos/generations`
- 源码已注册的是：
  - `GET /sora/v1/models`
  - `POST /sora/v1/chat/completions`

另外，源码里还存在一组 **JWT 用户态后台接口**：

- `POST /api/v1/sora/generate`
- `GET /api/v1/sora/models`
- `GET /api/v1/sora/generations`

这组 `/api/v1/sora/*` 不属于本文档描述的 **API Key 对外网关接口**，不能混写成同一类对外能力。

源码中的公开视频模型还包括：

- `sora2-landscape-10s`
- `sora2-portrait-10s`
- `sora2-landscape-15s`
- `sora2-portrait-15s`
- `sora2-landscape-25s`
- `sora2-portrait-25s`
- `sora2pro-*`
- `sora2pro-hd-*`

### 8.2 当前公网实测结果

**测试对象**

- `GET https://sub-lb.tap365.org/sora/v1/models`
- `POST https://sub-lb.tap365.org/sora/v1/chat/completions`

**本轮结果**

- `GET /sora/v1/models`：`200`，但返回的是前端 HTML 壳，不是 JSON 模型列表
- `POST /sora/v1/chat/completions`：`405`，响应头 `Allow: GET, HEAD`
- 2026-04-26 09:31 回归复测，结果与首轮一致

### 8.3 结论

结论不是“源码没有视频”，而是：

- **源码里有视频路由**
- **当前 `sub-lb.tap365.org` 公网入口未把这条视频能力正确暴露出来**
- 因此当前不能把视频能力写成“对外可直接用”

如后续要重新验收视频，请继续优先测试：

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/sora/v1/chat/completions \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sora2-landscape-10s",
    "messages": [
      {
        "role": "user",
        "content": "A cinematic wide shot of a red sports car driving through a rainy neon city at night."
      }
    ],
    "stream": false
  }'
```

但当前公网口径必须按**未打通**写。

---

## 9. 本轮标准测试日志

### 9.1 测试目标

验证 `sub-lb.tap365.org` 上 OpenAI / Grok 对外 API 的文本、图片、视频入口，确认哪些能力可直接对外公布。

### 9.2 测试类型

- `业务接口实测`
- `源码路由交叉验证`

### 9.3 测试环境

- 仓库：`/Users/houzi/code/06-production-business-money-live/sublb-demo`
- 参考源码：`/Users/houzi/code/06-production-business-money-live/sublb/main`
- 机器：本机 macOS
- 目标 Host：`https://sub-lb.tap365.org`

### 9.4 测试对象

- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/responses`
- `POST /v1/images/generations`
- `GET /sora/v1/models`
- `POST /sora/v1/chat/completions`

### 9.5 认证方式

- OpenAI 测试：`sub-lb.tap365.org/openai-compatible/SK(脱敏)`
- Grok 测试：`sub-lb.tap365.org/grok图文/SK(脱敏)`

### 9.6 执行步骤

1. 用 OpenAI key 调 `GET /v1/models`
2. 用 OpenAI key 调 `POST /v1/chat/completions`
3. 用 OpenAI key 调 `POST /v1/responses`
4. 用 OpenAI key 连续 3 次调 `POST /v1/images/generations`
5. 用 Grok图文 key 调 `GET /v1/models`
6. 用 Grok图文 key 调 `POST /v1/chat/completions`
7. 用 Grok图文 key 调 `POST /v1/responses`
8. 用 Grok图文 key 调 `POST /v1/images/generations`
9. 用 Grok图文 key 调 `GET /sora/v1/models`
10. 用 Grok图文 key 调 `POST /sora/v1/chat/completions`
11. 对视频入口做一次回归复测，确认公网边界是否变化

### 9.7 实际结果

- OpenAI 文本：`GET /v1/models` 返回 `gpt-5.5`；`POST /v1/chat/completions` 返回 `OK-OPENAI`；`POST /v1/responses` 返回 `status=completed`
- OpenAI 图片：连续 3 次 `502 origin_bad_gateway`
- Grok图文文本：`GET /v1/models` 返回 `grok-4.1-fast`、`grok-imagine-1.0`、`grok-imagine-1.0-fast`
- Grok图文对话：`POST /v1/chat/completions` 返回 `OK-GROK-TUWEN`
- Grok图文 Responses：`POST /v1/responses` 返回 `status=completed`，正文含 `OK-GROK-TUWEN-RESPONSES`
- Grok图片：`POST /v1/images/generations` 返回 `200`，`data[0].url` 可下载成功
- 公网视频：`GET /sora/v1/models` 返回 HTML；`POST /sora/v1/chat/completions` 返回 `405`；09:31 回归复测结果不变

### 9.8 结论

- `OpenAI 文本接口`：可用
- `Grok 文本接口`：可用
- `Grok 图片接口`：可用
- `OpenAI 图片接口`：当前不可用
- `公网视频接口`：当前不可用
- `grok-imagine-1.0` 对外默认分组口径仍写 `grok图片`，但本轮已确认 `grok图文` key 也能真实调起

### 9.9 失败信息

- OpenAI 图片：Cloudflare `502 origin_bad_gateway`
- 公网视频模型列表：返回前端 HTML 壳，不是 JSON 模型列表
- 公网视频生成：`405`，`Allow: GET, HEAD`

### 9.10 证据位置

- OpenAI 汇总文件：`/Users/houzi/code/06-production-business-money-live/sublb-demo/api_validation_20260426_091533.json`
- OpenAI models：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_091533_models.json`
- OpenAI chat：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_091533_chat_completions.json`
- OpenAI responses：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_091533_responses.json`
- OpenAI image fail #1：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_091533_images_generations.json`
- OpenAI image fail #2：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_091836_images_generations_retry2.json`
- OpenAI image fail #3：`/Users/houzi/code/06-production-business-money-live/sublb-demo/openai/20260426_092016_images_generations_retry3.json`
- Grok图文汇总文件：`/Users/houzi/code/06-production-business-money-live/sublb-demo/api_validation_20260426_092655_grok_tuwen.json`
- Grok图文 models：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_models.json`
- Grok图文 models headers：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_models.headers.txt`
- Grok图文 chat：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_chat_completions.json`
- Grok图文 chat headers：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_chat_completions.headers.txt`
- Grok图文 responses：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_responses.json`
- Grok图文 responses headers：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_responses.headers.txt`
- Grok图文 image response：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_images_generations.json`
- Grok图文 image headers：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_images_generations.headers.txt`
- Grok图文 image file：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/grok-imagine-1.0_20260426_092655.jpg`
- Video models fail #1：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_sora_models.json`
- Video models headers #1：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_sora_models.headers.txt`
- Video chat fail #1：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_sora_chat_completions.json`
- Video chat headers #1：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_092655_grok_tuwen_sora_chat_completions.headers.txt`
- Video models fail #2：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_093133_grok_tuwen_sora_models.json`
- Video models headers #2：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_093133_grok_tuwen_sora_models.headers.txt`
- Video chat fail #2：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_093133_grok_tuwen_sora_chat_completions.json`
- Video chat headers #2：`/Users/houzi/code/06-production-business-money-live/sublb-demo/grok/20260426_093133_grok_tuwen_sora_chat_completions.headers.txt`

---

## 10. 最终对外口径

当前可以直接对外写进接入文档的能力：

- OpenAI 文本：`/v1/chat/completions`、`/v1/responses`
- Grok 文本：`/v1/chat/completions`、`/v1/responses`
- Grok 图片：`/v1/images/generations` + `grok-imagine-1.0` + 默认 `grok图片`
- 追加技术边界：用户自备 `grok图文` key 也已实测可调用 `grok-imagine-1.0`

当前**不要**直接对外宣传为已可用的能力：

- `gpt-image-2` 公网生图
- `sub-lb.tap365.org` 公网视频生成
