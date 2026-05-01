# gpt-image-2 使用指南

测试日期：2026-05-01

文档版本：v1.0

## 1. 结论

`gpt-image-2` 是当前 OpenAI 图片分组推荐模型，同一个模型同时用于：

- 文生图：`POST /v1/images/generations`
- 图片编辑 / 图生图 / 修图：`POST /v1/images/edits`
- 遮罩局部编辑：`POST /v1/images/edits`，multipart 中增加 `mask=@mask.png`

不要把模型名写成 `gpt-img-2` 或 `gpt-image-edit`。当前推荐与实测模型名是：`gpt-image-2`。

## 2. Base URL 与鉴权

公网图片专项验收入口：

```bash
export SUBLB_IMAGE_BASE_URL="https://api.tap365.org/v1"
export SUBLB_API_KEY="你的 SubLB 图片分组 Key"
```

认证方式：

```http
Authorization: Bearer <YOUR_SUBLB_API_KEY>
Accept: application/json
```

注意：

- 文档和示例只写 `$SUBLB_API_KEY`，不要把真实 Key 写进代码仓库、日志或截图。
- 如果你使用的是仓库通用环境变量 `SUBLB_BASE_URL=https://sub-lb.tap365.org`，则请求路径要写成 `$SUBLB_BASE_URL/v1/images/generations`、`$SUBLB_BASE_URL/v1/images/edits`。
- 如果你使用本指南的 `SUBLB_IMAGE_BASE_URL=https://api.tap365.org/v1`，则请求路径写成 `$SUBLB_IMAGE_BASE_URL/images/generations`、`$SUBLB_IMAGE_BASE_URL/images/edits`。

## 3. 能力与接口

| 能力 | 接口 | 请求格式 | 模型 | 响应重点 |
|---|---|---|---|---|
| 文生图 | `POST /v1/images/generations` | JSON | `gpt-image-2` | `data[0].b64_json` |
| 图片编辑 / 图生图 / 修图 | `POST /v1/images/edits` | `multipart/form-data` | `gpt-image-2` | `data[0].b64_json` |
| 遮罩局部编辑 | `POST /v1/images/edits` | `multipart/form-data`，包含 `mask` | `gpt-image-2` | `data[0].b64_json` |

常用参数：

| 参数 | 位置 | 说明 |
|---|---|---|
| `model` | JSON 或 multipart 字段 | 固定写 `gpt-image-2` |
| `prompt` | JSON 或 multipart 字段 | 生成或编辑指令 |
| `image` / `image[]` | multipart 文件字段 | 待编辑图片；建议 PNG |
| `mask` / `mask[]` | multipart 文件字段 | 局部编辑遮罩；建议 PNG；有透明区域时用于指示可编辑区域 |
| `size` | JSON 或 multipart 字段 | 常用 `1024x1024` |
| `n` | JSON 或 multipart 字段 | 生成数量，通常 `1` |
| `response_format` | multipart 字段 | 推荐 `b64_json` |

## 4. 文生图 curl 示例

```bash
curl --noproxy '*' "$SUBLB_IMAGE_BASE_URL/images/generations" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-image-2",
    "prompt": "White background, simple blue letter O icon, clean vector style",
    "size": "1024x1024",
    "n": 1
  }'
```

成功响应通常包含：

```json
{
  "data": [
    { "b64_json": "..." }
  ]
}
```

保存返回图片示例：

```bash
jq -r '.data[0].b64_json' generation.json | base64 --decode > generation.png
```

## 5. 图片编辑 / 修图 curl 示例

`/v1/images/edits` 必须使用 `multipart/form-data`。不要把 `image` 写进 JSON body。

```bash
curl --noproxy '*' "$SUBLB_IMAGE_BASE_URL/images/edits" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json" \
  -F "model=gpt-image-2" \
  -F "prompt=把这张图改成更明亮的蓝色风格，保留主体构图" \
  -F "image=@./source.png;type=image/png" \
  -F "size=1024x1024" \
  -F "response_format=b64_json"
```

成功响应同样读取：

```text
data[0].b64_json
```

## 6. 遮罩局部编辑 curl 示例

遮罩编辑仍然使用同一个接口和同一个模型，只是额外上传 `mask` 文件。

```bash
curl --noproxy '*' "$SUBLB_IMAGE_BASE_URL/images/edits" \
  -H "Authorization: Bearer $SUBLB_API_KEY" \
  -H "Accept: application/json" \
  -F "model=gpt-image-2" \
  -F "prompt=只把遮罩区域改成红色丝带，其余区域保持不变" \
  -F "image=@./source.png;type=image/png" \
  -F "mask=@./mask.png;type=image/png" \
  -F "size=1024x1024" \
  -F "response_format=b64_json"
```

建议：

- `image` 和 `mask` 尺寸保持一致。
- 优先使用 PNG，尤其是需要透明区域的遮罩。
- `mask` 是 multipart 文件字段，不是 JSON 字段。

## 7. 常见错误

| 错误写法 | 问题 | 正确写法 |
|---|---|---|
| `model=gpt-img-2` | 不是当前推荐模型名 | `model=gpt-image-2` |
| `model=gpt-image-edit` | 编辑也不使用这个模型名 | `model=gpt-image-2` |
| JSON body 里放 `image` / `mask` | 图片编辑接口需要 multipart | 用 `-F "image=@./source.png"`、`-F "mask=@./mask.png"` |
| 手写 multipart `Content-Type` boundary | 容易破坏请求体 | 让 curl / Postman / SDK 自动生成 |
| 只测 `/v1/models` 就认为可用 | 模型枚举不等于业务接口成功 | 至少真实调用一次生成或编辑接口 |

## 8. 真实验收记录

本轮公网图片专项验收使用真实业务接口完成，不是 `/health` 存活检查。

- 公网入口：`https://api.tap365.org/v1`
- 模型：`gpt-image-2`
- 认证：Bearer 用户 Key，文档仅记录脱敏，不写完整 Key

实测结果：

| 步骤 | 接口 | 结果 |
|---|---|---|
| 生图 | `POST /v1/images/generations` | HTTP 200 |
| 无 mask 编辑 | `POST /v1/images/edits` | HTTP 200 |
| 带 mask 编辑 | `POST /v1/images/edits` | HTTP 200 |

关键返回字段摘要：

```json
{
  "baseURL": "https://api.tap365.org/v1",
  "model": "gpt-image-2",
  "generation": { "http_status": 200, "ok": true },
  "edit_no_mask": { "http_status": 200, "ok": true },
  "edit_with_mask": { "http_status": 200, "ok": true }
}
```

证据位置：

```text
/Users/houzi/code/06-production-business-money-live/sublb/main/ops/openai_images_edits_mask_prod_release_verify_20260501.md
/Users/houzi/code/06-production-business-money-live/sublb/main/ops/evidence/openai_images_edits_mask_release_20260501_104728/public_image_edit_mask_20260501_105717/summary.json
```
