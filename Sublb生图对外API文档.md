# Sublb 生图对外 API 文档

测试日期：2026-04-26  
文档版本：v3.1

> 这份文档只写“生图”接入，不写视频。
> 目标是让接入方按最短路径完成：**先选分组 key → 再发请求 → 再看响应 → 最后用 curl 验证**。

---

## 1. 先选分组 key

生图不是先看模型名，而是先看**分组 key**。
接入时必须先确定你手里的 key 属于哪个分组，再把 `model` 传对。

### 1.1 当前对外口径

| 分组 key | 对应模型 | 对外默认口径 | 当前状态 |
|---|---|---|---|
| `openai-image-2026042` | `gpt-image-2` | OpenAI 生图分组 | 本轮已真实跑通，返回过 `b64_json`；前两次失败属于上游瞬时不可用，不是 key 写错 |
| `grok图片` | `grok-imagine-1.0` | Grok 生图分组 | 本轮可用 |

### 1.2 最容易搞错的点

1. **分组 key** 不是模型名。
2. `gpt-image-2` 对外应走 `openai-image-2026042`。
3. `grok-imagine-1.0` 对外应走 `grok图片`。
5. 看到某个分组曾经成功，不代表这个分组永远稳定；**当前状态要看真实响应**。

---

## 2. 如何使用

### 2.1 Base URL

```text
https://sub-lb.tap365.org
```

建议把这次用到的分组名和 key 放进本地 `.env`，对外只保留 `.env.example`：

```bash
cp .env.example .env
```

对应变量：

- `SUBLB_BASE_URL`
- `SUBLB_OPENAI_IMAGE_GROUP` / `SUBLB_OPENAI_IMAGE_API_KEY`
- `SUBLB_GROK_IMAGE_GROUP` / `SUBLB_GROK_IMAGE_API_KEY`

### 2.2 入口路径

生图统一走：

```text
POST /v1/images/generations
```

### 2.3 认证方式

统一使用：

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
Accept: application/json
```

### 2.4 最短使用顺序

1. 先确认你手里的 key 属于哪个分组。
2. 决定 `model`：
   - `openai-image-2026042` → `gpt-image-2`
   - `grok图片` → `grok-imagine-1.0`
3. 调 `POST /v1/images/generations`
4. 从响应里取图片地址：
   - 如果返回 `data[0].url`，就下载这个 URL
   - 如果返回 `data[0].b64_json`，就按 base64 保存

---

## 3. 请求是什么

### 3.1 请求体字段

当前实测最核心的字段只有这些：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `model` | string | 是 | 生图模型名，例如 `gpt-image-2`、`grok-imagine-1.0` |
| `prompt` | string | 是 | 生成提示词 |
| `size` | string | 否 | 例如 `1024x1024` |
| `n` | number | 否 | 建议先用 `1` |

### 3.2 `gpt-image-2` 请求示例

```json
{
  "model": "gpt-image-2",
  "prompt": "生成一张白底、蓝色玻璃质感字母 O 图标。",
  "size": "1024x1024",
  "n": 1
}
```

### 3.3 `grok-imagine-1.0` 请求示例

```json
{
  "model": "grok-imagine-1.0",
  "prompt": "生成一张白底、黑金质感字母 G 图标。",
  "size": "1024x1024",
  "n": 1
}
```

---

## 4. 响应是什么

### 4.1 成功响应的常见形态

生图成功后，常见有两种返回方式：

#### 方式 A：返回图片 URL

```json
{
  "created": 1777166924,
  "data": [
    {
      "url": "https://grok74.tap365.org/v1/files/image/e121edfe-86b3-4c7f-8d1c-9d52fecda8e5.jpg"
    }
  ],
  "usage": {
    "total_tokens": 0,
    "input_tokens": 0,
    "output_tokens": 0
  }
}
```

#### 方式 B：返回 base64 图片内容

```json
{
  "created": 1777176346,
  "data": [
    {
      "b64_json": "iVBORw0KGgoAAAANSUhEUgA..."
    }
  ]
}
```

你真正要看的不是 `created`，而是：

- `data[0].url`：图片下载地址
- 或者 `data[0].b64_json`：base64 图片内容

### 4.2 失败响应

前两次复测里，OpenAI 生图链路出现过：

- `502 origin_bad_gateway`
- `Service temporarily unavailable`

这意味着：

- 请求已经到网关了
- 但当时上游还没切到可用实例，或者调度到的账户/后端暂时不可用

不要把这种错误直接当成“模型名写错”。

### 4.3 响应解析建议

接入方不要只写死一种返回格式，建议同时兼容：

- `data[0].url`
- `data[0].b64_json`

如果你只准备解析一种字段，后面切模型时会很容易挂。

---

## 5. 可直接测试的 curl

下面的 curl 都可以直接改 key 后执行。

### 5.1 先测 OpenAI 生图分组 `openai-image-2026042`

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/images/generations \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "生成一张白底、蓝色玻璃质感字母 O 图标。",
    "size": "1024x1024",
    "n": 1
  }'
```

### 5.2 再测 Grok 生图分组 `grok图片`

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/images/generations \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "grok-imagine-1.0",
    "prompt": "生成一张白底、黑金质感字母 G 图标。",
    "size": "1024x1024",
    "n": 1
  }'
```

---

## 6. 本轮实测结论

| 分组 key | 结果 |
|---|---|
| `openai-image-2026042` / `gpt-image-2` | 本轮已真实跑通，返回过 `b64_json`；前两次失败是上游瞬时不可用 |
| `grok图片` / `grok-imagine-1.0` | 可用，返回真实图片 URL |

### 6.1 这份文档的最终口径

可以对外写：

- `grok-imagine-1.0` 对外默认分组口径是 `grok图片`
- `gpt-image-2` 对外对应 `openai-image-2026042`，本轮已跑通并拿到真实 `b64_json`

---

## 7. 测试证据

仓库里已经落了这批真实产物：

- `openai/`
- `grok/`
- `test_runs/`
- `api_validation_*.json`

重点目录：

- `test_runs/20260426_120319_gpt_img_openai_image/`
- `test_runs/20260426_115833_pro_gpt_image_2/`
- `test_runs/20260426_115846_pro_gpt_image_2_retry/`

> 这里只写仓库内证据目录，不把真实密钥、Cookie、Bearer token 写进文档。
