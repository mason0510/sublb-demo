# Sublb 生图对外 API 文档

测试日期：2026-04-26  
文档版本：v3.0

> 这份文档只写“生图”接入，不写视频。
> 目标是让接入方按最短路径完成：**选对分组 key → 发请求 → 看响应 → 用 curl 验证**。

---

## 1. 先选分组 key

生图不是先选模型名，而是先选**分组 key**。  
接入时要先把“key 归属的分组”搞清楚，再把 `model` 传对。

### 1.1 当前对外口径

| 分组 key | 对应模型 | 对外默认口径 | 说明 |
|---|---|---|---|
| `pro` | `gpt-image-2` | OpenAI 生图分组 | 这条链路本轮实测返回 `502 origin_bad_gateway`，当前不可用 |
| `grok图片` | `grok-imagine-1.0` | Grok 生图分组 | 本轮实测可用 |
| `grok图文` | `grok-imagine-1.0` | 技术上也能调用同一模型 | 这是“可调用事实”，但对外默认口径仍写 `grok图片` |

### 1.2 最容易搞错的点

1. **分组 key** 不是模型名。
2. `gpt-image-2` 对外应走 `pro`。
3. `grok-imagine-1.0` 对外应走 `grok图片`。
4. 如果你拿到的是 `grok图文` key，本轮实测也能调用 `grok-imagine-1.0`，但文档和对外说明不要把默认口径改乱。

---

## 2. 如何使用

### 2.1 Base URL

```text
https://sub-lb.tap365.org
```

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
```

### 2.4 调用顺序

最短使用步骤就是：

1. 先确认你手里的 key 属于哪个分组。
2. 决定 `model`：
   - `pro` → `gpt-image-2`
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

本轮 Grok 生图的成功响应是：

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

你真正要看的不是 `created`，而是：

- `data[0].url`：图片下载地址
- 或者 `data[0].b64_json`：base64 图片内容

### 4.2 失败响应

本轮 OpenAI 生图链路连续 3 次失败，返回的是：

- `502 origin_bad_gateway`

这意味着：

- 请求已经到网关了
- 但是该链路当前没有打通到可用上游

不要把这种错误当成“模型名写错”。

### 4.3 响应解析建议

接入方不要只写死一种返回格式，建议同时兼容：

- `data[0].url`
- `data[0].b64_json`

如果你只准备解析一种字段，后面切模型时会很容易挂。

---

## 5. 可直接测试的 curl

下面的 curl 都是可以直接改 key 后执行的。

### 5.1 先测 OpenAI 生图分组 `pro`

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

### 5.2 再测 Grok 生图分组 `grok图片`

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

### 5.3 如果你手里拿到的是 `grok图文` key

```bash
curl --noproxy '*' \
  https://sub-lb.tap365.org/v1/images/generations \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-1.0",
    "prompt": "生成一张极简风格、白底、金属质感的字母 G 图标。",
    "size": "1024x1024",
    "n": 1
  }'
```

这条是为了说明：**`grok图文` key 本轮也能真实调起同一个生图模型**。  
但对外默认口径仍然写 `grok图片`。

---

## 6. 本轮实测结论

| 分组 key | 结果 |
|---|---|
| `pro` / `gpt-image-2` | 当前不可用，连续 3 次 `502 origin_bad_gateway` |
| `grok图片` / `grok-imagine-1.0` | 可用，返回真实图片 URL |
| `grok图文` / `grok-imagine-1.0` | 可真实调起，本轮实测可用 |

### 6.1 这份文档的最终口径

可以对外写：

- `grok-imagine-1.0` 对外默认分组口径是 `grok图片`
- `grok图文` key 也能调通 `grok-imagine-1.0`
- `gpt-image-2` 对外对应 `pro`，但本轮公网实测未通过

---

## 7. 测试证据

仓库里已经落了这批真实产物：

- `openai/`
- `grok/`
- `test_runs/`
- `api_validation_*.json`

> 这里只写仓库内证据目录，不把真实密钥、Cookie、Bearer token 写进文档。

