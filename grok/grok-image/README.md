# Grok 图片生成与编辑 API

面向 API 接入用户的 OpenAI-compatible 图片接口文档。

Grok-Image 按量套餐直连 Grok 图片 API，支持图片生成和图片编辑。生图和编辑都使用 `grok-imagine-image-quality`。本套餐不含 Grok 文本对话。

## 1. 基础信息

**Base URL**

```text
https://chainfuel.tap365.org
```

**认证方式**

```http
Authorization: Bearer YOUR_API_KEY
```

请将 `YOUR_API_KEY` 替换为你自己的 API Key。不要把真实 Key 写入代码仓库、前端页面、日志或公开文档。

## 2. 支持模型

| 模型 | 接口 | 用途 |
|---|---|---|
| `grok-imagine-image-quality` | `POST /v1/images/generations` | 图片生成 |
| `grok-imagine-image-quality` | `POST /v1/images/edits` | 图片编辑 |

请把 `grok-imagine-image-quality` 当作当前默认模型。`grok-imagine-1.0`、`grok-imagine-1.0-edit`、`grok-imagine-image` 即使能在 `/v1/models` 里看到，也不要当作稳定默认值。

模型是否可用还取决于你的账号、套餐和当前分组权限。真正能不能用，以对应业务接口返回 `data[0].url` 为准。

## 3. 支持尺寸

```text
1024x1024
1024x1792
1280x720
1792x1024
720x1280
```

## 4. 图片生成

### 4.1 请求

```http
POST /v1/images/generations
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

### 4.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 图片模型名称。 |
| `prompt` | string | 是 | 图片描述。不能为空。 |
| `n` | integer | 否 | 生成数量，建议传 `1`。 |
| `size` | string | 否 | 输出尺寸，默认 `1024x1024`。 |
| `response_format` | string | 否 | 可传 `url`；返回结果会提供可访问图片地址。 |

### 4.3 curl 示例

```bash
curl -X POST 'https://chainfuel.tap365.org/v1/images/generations' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "model": "grok-imagine-image-quality",
    "prompt": "一只小橘猫坐在蓝色机器人旁边，柔和光线，无文字",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 4.4 成功响应

```json
{
  "created": 1788845151,
  "data": [
    {
      "url": "https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev/images/grok/2026/09/08/IMAGE_ID.jpeg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

读取字段：

```text
data[0].url
```

返回的 `url` 是可直接访问的图片地址。客户端拿到 URL 后，可以直接在浏览器打开，或使用 HTTP 客户端下载。

## 5. 图片编辑

### 5.1 请求

```http
POST /v1/images/edits
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY
```

### 5.2 multipart 参数

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 图片模型名称。 |
| `prompt` | string | 是 | 编辑指令。 |
| `image` | file | 是 | 要编辑的本地图片文件。 |
| `n` | integer/string | 否 | 生成数量，建议传 `1`。 |
| `size` | string | 否 | 输出尺寸。 |

`image` 必须上传真实文件，不能把图片 URL 当成文件字段传入。

### 5.3 curl 示例

```bash
curl -X POST 'https://chainfuel.tap365.org/v1/images/edits' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -F 'model=grok-imagine-image-quality' \
  -F 'prompt=将蓝色圆形改成红色方形，保持背景和构图不变' \
  -F 'n=1' \
  -F 'size=1024x1024' \
  -F 'image=@input.png;type=image/png'
```

### 5.4 成功响应

```json
{
  "created": 1788845151,
  "data": [
    {
      "url": "https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev/images/grok/2026/09/08/IMAGE_ID.jpeg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

编辑结果同样读取：

```text
data[0].url
```

## 6. JavaScript 示例

```js
const response = await fetch(
  'https://chainfuel.tap365.org/v1/images/generations',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUBLB_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image-quality',
      prompt: '一只白色小狗，干净背景，无文字',
      n: 1,
      size: '1024x1024',
    }),
  },
);

if (!response.ok) {
  throw new Error(`HTTP ${response.status}: ${await response.text()}`);
}

const result = await response.json();
const imageUrl = result.data?.[0]?.url;
console.log(imageUrl);
```

## 7. Python 编辑示例

```python
import os
import requests

with open("input.png", "rb") as image_file:
    response = requests.post(
        "https://chainfuel.tap365.org/v1/images/edits",
        headers={"Authorization": f"Bearer {os.environ['SUBLB_API_KEY']}"},
        data={
            "model": "grok-imagine-image-quality",
            "prompt": "把蓝色圆形改成红色方形，保持背景不变",
            "n": "1",
            "size": "1024x1024",
        },
        files={"image": ("input.png", image_file, "image/png")},
        timeout=180,
    )

response.raise_for_status()
result = response.json()
print(result["data"][0]["url"])
```

## 8. 错误响应格式

```json
{
  "error": {
    "code": "invalid_image_size",
    "message": "Unsupported image size: 800x800"
  }
}
```

### 8.1 常见 HTTP 状态码

| 状态码 | 含义 | 优先检查 |
|---:|---|---|
| `400` | 请求参数错误 | `model`、`prompt`、`size`、multipart 字段 |
| `401` | API Key 缺失或无效 | 是否使用 `Authorization: Bearer ...` |
| `403` | 账号或分组没有权限 | 模型权限、套餐额度、账号状态 |
| `404` | 路径或模型不存在 | Base URL、接口路径、模型拼写 |
| `413` | 上传文件过大 | 图片大小限制 |
| `429` | 请求过于频繁或额度限制 | 降低频率并稍后重试 |
| `500` | 服务内部错误 | 保存 request ID 后联系维护方 |
| `502` | 上游或图片结果获取失败 | 稍后重试，检查上游状态 |
| `503` | 服务暂时不可用 | 稍后重试或更换可用模型 |
| `504` | 请求超时 | 减小图片、简化 prompt 或稍后重试 |

### 8.2 常见错误码

| 错误码 | 说明 |
|---|---|
| `invalid_model` | 模型名称不正确或当前账号无权使用。 |
| `invalid_prompt` | `prompt` 缺失或为空。 |
| `invalid_image_size` | `size` 不在支持列表中。 |
| `invalid_image_file` | 上传文件不是有效图片。 |
| `image_fetch_failed` | 图片结果获取失败。 |
| `image_content_invalid` | 返回内容不是有效图片。 |
| `rate_limit_exceeded` | 超过请求频率限制。 |
| `insufficient_quota` | 账号额度不足。 |
| `upstream_model_unavailable` | 上游模型暂时不可用。 |

## 9. 调试建议

1. 先使用 `grok-imagine-image-quality` 做最小生图请求，再测编辑。
2. 确认请求路径为 `/v1/images/generations` 或 `/v1/images/edits`。
3. 确认认证头格式为 `Bearer YOUR_API_KEY`。
4. 确认 `size` 使用支持列表中的值。
5. 编辑请求确认 `image` 是 multipart 文件字段。
6. 成功响应读取 `data[0].url`。
7. 不要把 HTTP 200 之外的响应当作成功。
8. 出现错误时保留 HTTP 状态码、错误码和 request ID，不要记录 API Key。

## 10. 相关文档

Cloudflare R2 的服务端转存与对象存储实现说明单独放在：

- [R2_INTEGRATION.md](./R2_INTEGRATION.md)

普通 API 使用者只需要读取本文，不需要配置 Cloudflare R2。
