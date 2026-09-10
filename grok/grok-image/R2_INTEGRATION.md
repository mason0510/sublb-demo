# Grok Image + Cloudflare R2 对接文档

**版本**：v1.0
**日期**：2026-09-08
**适用对象**：SubLB / OpenAI-compatible 网关后端、SDK、前端调用方
**目标**：将 Grok 图片生成与编辑结果统一转换为可长期访问的 Cloudflare R2 图片 URL，不把 `imgen.x.ai` 临时地址直接暴露给用户。

---

## 1. 结论与推荐架构

Grok 上游当前返回的是临时图片 URL：

```json
{
  "data": [
    {
      "url": "https://imgen.x.ai/xai-imgen/xai-tmp-imgen-....jpeg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

该 URL 可能出现 `403` 或过期，网关不应原样返回给最终用户。

推荐链路：

```text
客户端
  ↓
/v1/images/generations 或 /v1/images/edits
  ↓
SubLB 调用 Grok 上游
  ↓
读取上游 data[0].url
  ↓
网关服务端立即下载图片
  ↓
上传 Cloudflare R2
  ↓
返回 R2 public_url
```

最终用户只看到：

```text
https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev/images/grok/...
```

---

## 2. API 地址与模型

### 2.1 网关地址

```text
https://chainfuel.tap365.org
```

### 2.2 图片生成

```http
POST /v1/images/generations
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

当前模型白名单建议：

```text
grok-imagine-image-quality
grok-imagine-image
grok-imagine-image-2.0
```

模型定位：

| 模型 | 用途 | 默认建议 |
|---|---|---|
| `grok-imagine-image-quality` | 图片生成与编辑 | 当前默认模型 |
| `grok-imagine-image` | 图片生成 | 不要当默认；生图不稳定，编辑未作为可用口径 |
| `grok-imagine-image-2.0` | 历史模型名 | 仅保留白名单兼容，不要当新默认 |

> 对外用户文档与套餐简介以 `grok-imagine-image-quality` 为默认。`grok-imagine-1.0`、`grok-imagine-1.0-edit` 不要当作新默认模型。

### 2.3 图片编辑

```http
POST /v1/images/edits
Content-Type: multipart/form-data
Authorization: Bearer YOUR_API_KEY
```

当前编辑入口兼容以下模型：

```text
grok-imagine-image-quality
grok-imagine-image
grok-imagine-image-2.0
```

> 编辑默认模型与生图一致，使用 `grok-imagine-image-quality`。服务端应保留可配置模型映射。

---

## 3. 图片生成请求

### 3.1 请求字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 默认 `grok-imagine-image-quality`。白名单可同时保留 `grok-imagine-image`、`grok-imagine-image-2.0`。 |
| `prompt` | string | 是 | 图片描述。建议限制长度并拒绝空字符串。 |
| `n` | integer | 否 | 生成数量。推荐默认 `1`，当前套餐优先按单图处理。 |
| `size` | string | 否 | 图片尺寸。默认 `1024x1024`。 |
| `response_format` | string | 否 | 若兼容 OpenAI 字段，可接受 `url` 或 `b64_json`；Grok 当前实际上返回 URL，网关最终统一返回自己的 R2 URL。 |

### 3.2 支持尺寸

```text
1024x1024
1024x1792
1280x720
1792x1024
720x1280
```

服务端应在请求进入上游前校验尺寸：

```text
不在白名单 → HTTP 400 INVALID_IMAGE_SIZE
```

### 3.3 请求示例

```bash
curl -X POST 'https://chainfuel.tap365.org/v1/images/generations' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "model": "grok-imagine-image-quality",
    "prompt": "一只小橘猫坐在蓝色机器人旁边，简洁科技插画风格，无文字",
    "n": 1,
    "size": "1024x1024"
  }'
```

---

## 4. 图片编辑请求

### 4.1 multipart 字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `model` | string | 是 | 默认 `grok-imagine-image-quality`。 |
| `prompt` | string | 是 | 编辑指令，例如“把蓝色圆形改成红色方形”。 |
| `image` | file | 是 | 本地图片文件，不能把远程 URL 字符串放进该字段。 |
| `size` | string | 否 | 目标尺寸；使用支持尺寸白名单。 |
| `n` | string/integer | 否 | 生成数量，默认 `1`。 |

建议限制：

- 文件大小不超过 20 MiB；
- 允许 PNG、JPEG、WebP；
- 按文件魔数和真实 MIME 判断，不只信任扩展名；
- 服务端接收后使用临时文件或流式转发，处理完成后删除临时文件。

### 4.2 请求示例

```bash
curl -X POST 'https://chainfuel.tap365.org/v1/images/edits' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -F 'model=grok-imagine-image-quality' \
  -F 'prompt=将蓝色圆形改成红色方形，保持背景和构图不变' \
  -F 'size=1024x1024' \
  -F 'n=1' \
  -F 'image=@input.png;type=image/png'
```

---

## 5. 推荐响应格式

### 5.1 统一成功响应

生成和编辑都统一返回网关自己的 R2 地址：

```json
{
  "created": 1788845151,
  "data": [
    {
      "url": "https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev/images/grok/2026/09/08/433897ee-f721-91ad-b115-7bf4a6c65147.jpeg",
      "mime_type": "image/jpeg",
      "width": 1024,
      "height": 1024
    }
  ],
  "usage": {
    "cost_in_usd_ticks": 200000000
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
|---|---|---|
| `created` | integer | Unix 时间戳。没有上游值时由网关生成。 |
| `data` | array | 图片结果数组。即使 `n=1` 也保持数组结构。 |
| `data[].url` | string | **R2 自有公开 URL**，不能是 `imgen.x.ai` URL。 |
| `data[].mime_type` | string | 图片 MIME，例如 `image/jpeg`。 |
| `data[].width` | integer | 可选，最终文件实际宽度。 |
| `data[].height` | integer | 可选，最终文件实际高度。 |
| `usage.cost_in_usd_ticks` | integer | 上游成本字段。`100000000` ticks = 1 美分；`10000000000` ticks = 1 美元。仅用于内部成本记录，不直接替代用户计费规则。 |

### 5.2 不推荐的响应

```json
{
  "data": [
    {
      "url": "https://imgen.x.ai/xai-imgen/xai-tmp-imgen-....jpeg"
    }
  ]
}
```

原因：临时地址可能过期、返回 403、受访问策略限制，最终用户无法稳定使用。

### 5.3 不建议默认返回 Base64

`b64_json` 可以作为内部兜底，但不建议默认返回：

- 响应体明显变大；
- 占用客户端和网关内存；
- 不利于缓存和 CDN；
- 不适合批量出图。

---

## 6. Cloudflare R2 配置

### 6.1 当前可用公开地址

本地 `cf r2 list` 与 `cf r2 info` 已验证当前桶可用，公开 URL 前缀为：

```text
https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev
```

已有对象示例路径：

```text
images/2026-03-14/...
uploads/image-studio/1/2026/05/17/...
```

### 6.2 推荐对象路径

```text
images/grok/{yyyy}/{mm}/{dd}/{request_id}.{ext}
```

示例：

```text
images/grok/2026/09/08/a121b4ad-9235-9229-97f6-f4cb42ca9ba6.jpeg
```

不要使用用户原始文件名作为唯一 key，避免覆盖和路径注入。

### 6.3 上传元数据

上传到 R2 时设置：

```text
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable
```

PNG、WebP 按真实 MIME 设置，不要统一伪装成 JPEG。

### 6.4 Demo CLI

当前可用 demo：

```text
/Users/houzi/test/scripts/r2_image_proxy_demo.py
```

从上游 URL 下载并上传：

```bash
python3 scripts/r2_image_proxy_demo.py \
  --source-url 'https://imgen.x.ai/xai-imgen/IMAGE.jpeg'
```

使用本地文件测试：

```bash
python3 scripts/r2_image_proxy_demo.py \
  --file input.png \
  --key images/grok/2026/09/08/demo.png
```

生产环境不要在每个 API 请求中启动 `cf` CLI；应使用 Cloudflare R2 的 S3-compatible SDK。

建议环境变量：

```text
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_BASE_URL=https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev
```

密钥只注入运行环境，不写进代码、Collection、日志或响应。

---

## 7. URL 下载与 R2 上传实现要求

### 7.1 上游 URL 下载

必须满足：

1. 只允许 HTTPS；
2. 当前 Grok 图片上游只允许 `imgen.x.ai`；
3. 不转发用户的 `Authorization` 到图片域名；
4. 连接超时建议 30 秒；
5. 总下载大小限制 20 MiB；
6. 校验 `Content-Type`；
7. 校验文件魔数；
8. 下载失败不返回 HTTP 200 + 死 URL；
9. 记录 request ID、上游状态码、耗时和失败原因；
10. 上传成功后再向客户端返回成功响应。

### 7.2 伪代码

```text
call upstream
if upstream_status != 2xx:
    return mapped_upstream_error

for item in upstream.data:
    if item.b64_json exists:
        decode and validate image bytes
    else if item.url exists:
        require https + host allowlist
        download image bytes without user Authorization
        validate status/content-type/size/magic bytes
    else:
        return image_result_missing

    key = images/grok/{date}/{request_id}.{extension}
    upload bytes to R2 with Content-Type and Cache-Control
    item.url = R2_PUBLIC_BASE_URL + "/" + key
    remove upstream URL fields if present

return normalized response
```

### 7.3 失败语义

| 场景 | 建议状态码 | 错误码 |
|---|---:|---|
| 模型不在白名单 | 400 | `invalid_model` |
| 尺寸不支持 | 400 | `invalid_image_size` |
| 用户图片格式错误 | 400 | `invalid_image_file` |
| 上游生成失败 | 保留上游映射 | `upstream_image_generation_failed` |
| 上游 URL 返回 403/404 | 502 | `image_fetch_failed` |
| 上游 URL 内容不是图片 | 502 | `image_content_invalid` |
| R2 上传失败 | 502 | `r2_upload_failed` |
| 全流程超时 | 504 | `image_pipeline_timeout` |

示例：

```json
{
  "error": {
    "code": "r2_upload_failed",
    "message": "image result was generated but could not be stored"
  }
}
```

---

## 8. 计费与幂等

### 8.1 成功条件

图片生成/编辑只有在以下条件全部满足时才算成功：

1. 上游返回有效图片结果；
2. 图片已下载或成功解码；
3. 图片已上传 R2；
4. R2 public URL 可访问；
5. 返回体中的 `data[].url` 是 R2 URL。

仅有上游 HTTP 200，不代表最终图片交付成功。

### 8.2 幂等 key

建议使用：

```text
request_id = gateway_request_id
object_key = images/grok/{date}/{request_id}.{ext}
```

失败重试时使用同一个 request ID，避免同一任务产生多个孤儿对象。R2 上传成功后再写 usage 成功记录。

### 8.3 清理策略

建议：

- 默认保留 7–30 天；
- 通过 R2 Lifecycle 自动清理；
- 失败任务的临时文件立即删除；
- 不在业务数据库长期保存上游 `imgen.x.ai` URL。

---

## 9. 验收用例

### 9.1 生成成功

验收：

- `POST /v1/images/generations` 返回 HTTP 200；
- `data[0].url` 以 `R2_PUBLIC_BASE_URL` 开头；
- URL HEAD/GET 返回 HTTP 200；
- `Content-Type` 为图片类型；
- `file` 或图片解析器确认文件有效。

### 9.2 编辑成功

验收：

- `POST /v1/images/edits` 使用 multipart；
- `image` 字段是真实本地文件；
- 返回 HTTP 200；
- `data[0].url` 为 R2 URL；
- 返回图片可下载并能解析。

### 9.3 上游临时 URL 失败

模拟上游 URL 返回 403：

- 网关不得返回上游 URL；
- 网关返回 HTTP 502；
- 错误码为 `image_fetch_failed`；
- 不产生成功 usage；
- 清理本地临时文件。

### 9.4 安全边界

测试以下输入均应被拒绝：

- `http://...`；
- 非 `imgen.x.ai` 域名；
- 重定向到私网/本机地址；
- 超过 20 MiB 的文件；
- MIME 与文件魔数不一致的文件。

---

## 10. 本次已验证证据

### R2 本地 PNG canary

```text
上传 key:
images/grok-demo/2026/09/08/r2-proxy-canary.png

验证结果:
HTTP 200
Content-Type: image/png
```

### Grok 图片转 R2

```text
R2 URL:
https://pub-87cd59069cf0444aad048f7bddec99af.r2.dev/images/grok-demo/2026/09/08/7624089ee1704c44a38323b112dc103c.jpg

验证结果:
HTTP 200
Content-Type: image/jpeg
尺寸: 1024x1024
```

---

## 11. 开发实施顺序

1. 抽出统一 `normalizeImageResult`；
2. 兼容上游 `b64_json` 和 `url` 两种结果；
3. 增加 URL host、大小、MIME、魔数校验；
4. 接入 R2 SDK 上传；
5. 替换 `data[].url` 为 R2 public URL；
6. 增加生成和编辑的成功/失败用例；
7. 验证 usage 只在 R2 交付成功后落账；
8. 灰度发布后观察 R2 上传耗时、403、502、对象数量和清理情况。
