# Grok 视频接入

支持通过文字或图片生成短视频，适合产品展示、动态海报、创意镜头和短视频素材。按余额扣费。

文档与 demo：<https://github.com/mason0510/sublb-demo/tree/docs/beginner-friendly-api-docs/grok>

Base URL：`https://chainfuel.tap365.org`

认证：

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

## 模型怎么选

| 需求 | 模型 | 图片 |
|---|---|---|
| 文字或带图 | `grok-video` | 可传 prompt、duration 或 seconds、aspect_ratio、resolution、size、image_url、reference_image_urls。必传时长 |
| 让一张图动起来 | `grok-video-1.5` | 必须传公网 `image_url` |
| 综合多张参考图 | `grok-image-video` | `reference_image_urls`，最多 7 张，最长 15 秒 |

`GET /v1/models` 只能说明模型可见，不等于这次调用一定成功。

## 使用流程

视频是异步生成：

1. 提交任务：`POST /v1/videos/generations`。响应里的 `request_id` 就是任务 ID。
2. 查询进度：`GET /v1/videos/{task_id}`。完成态是 `done`。
3. 下载视频：`GET /v1/videos/{task_id}/content`，得到 MP4。

不要把视频模型打到 `/v1/chat/completions` 或 `/v1/responses`。

## 参数

| 场景 | 时长字段 | 画面 | 不要传 |
|---|---|---|---|
| `grok-video` | `duration` 或 `seconds` | `aspect_ratio`、`resolution`、`size` 都可传 | `reference_images` 对象 |
| 单图 `grok-video-1.5` | `duration` | 跟随参考图 | `resolution`、`size`、`aspect_ratio` |
| 多图 `grok-image-video` | `seconds` | `aspect_ratio` + `resolution` | `image_url`、`input_reference`、`size` |

竖屏传 `aspect_ratio: "9:16"`。`size` 可以不传；要传只能是 `848x480`、`1696x960`、`1280x720`、`1920x1080`。

单次时长不超过 15 秒。下面的 3 秒、16:9、480p 是示例，不是唯一规格。

如果自己传 `size`，只能是横屏像素：`848x480`、`1696x960`、`1280x720`、`1920x1080`。不要传 `720x1280` 或 `480x848`。竖屏不要靠 `size`。

## 文生视频

```json
{
  "model": "grok-video",
  "prompt": "一把椅子放在暖色灯光下，镜头缓慢环绕",
  "duration": 3,
  "aspect_ratio": "16:9",
  "resolution": "480p"
}
```

竖屏只改这一处：`"aspect_ratio": "9:16"`。

```bash
curl -X POST "https://chainfuel.tap365.org/v1/videos/generations" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-video",
    "prompt": "暖光客厅边桌一角，陶瓷小猫摆件，镜头缓慢推近",
    "duration": 3,
    "aspect_ratio": "9:16",
    "resolution": "480p"
  }'
```

## 单图生视频

不要传 `resolution` 和 `size`。成片跟随参考图。

```json
{
  "model": "grok-video-1.5",
  "prompt": "镜头缓慢靠近，灯光和阴影自然变化",
  "image_url": "https://example.com/input.png",
  "duration": 3
}
```

`image_url` 必须是公网可直接打开的图片地址，不能是本地路径。

## 多参考图

最多 7 张，最长 15 秒。`reference_image_urls` 是字符串数组。不要同时传 `image_url` 或 `input_reference`。

```json
{
  "model": "grok-image-video",
  "prompt": "根据多张参考图生成流畅的高端产品展示视频，使用奢华灯光和简洁背景",
  "seconds": 15,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "reference_image_urls": [
    "https://example.com/ref-1.png",
    "https://example.com/ref-2.png"
  ]
}
```

多图之间尽量保持主体、风格或场景相关。提示词写清镜头、主体动作、灯光和场景变化。

## 查询和下载

```bash
curl "https://chainfuel.tap365.org/v1/videos/{task_id}" \
  -H "Authorization: Bearer <YOUR_API_KEY>"

curl "https://chainfuel.tap365.org/v1/videos/{task_id}/content" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -o output.mp4
```

完成态看 `done`。不要只看进度百分比，失败任务也可能显示 100%。提交被拒时响应里没有 `request_id`。

## Demo

同目录 `video-demo.mjs`：

```bash
VIDEO_API_KEY=<YOUR_API_KEY> node video-demo.mjs
VIDEO_ASPECT_RATIO=9:16 VIDEO_API_KEY=<YOUR_API_KEY> node video-demo.mjs
VIDEO_REFERENCE_IMAGES="https://example.com/input.png" VIDEO_API_KEY=<YOUR_API_KEY> node video-demo.mjs
```

一张图走单图生视频，不传 `resolution` 和 `size`。两张及以上走多参考图，字段是 `reference_image_urls`。

Postman 集合：`grok-video.postman_collection.json`。
