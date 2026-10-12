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

`aspect_ratio`：`1:1，16:9，9:16，4:3，3:4，3:2，2:3，21:9，5:2`。默认 `16:9`。竖屏用 `9:16`。`size` 可以不传；要传只能是 `848x480`、`1696x960`、`1280x720`、`1920x1080`。

单次时长不超过 15 秒。下面的 3 秒、16:9、480p 是示例，不是唯一规格。

如果自己传 `size`，只能是横屏像素：`848x480`、`1696x960`、`1280x720`、`1920x1080`。不要传 `720x1280` 或 `480x848`。竖屏不要靠 `size`。

## 文生视频

```json
{
  "model": "grok-video",
  "prompt": "0 到 3 秒，镜头缓慢推近椅子，暖光停在椅背。",
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
    "prompt": "0 到 3 秒，镜头推近陶瓷小猫，暖光停在桌面。",
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
  "prompt": "0 到 3 秒，镜头缓慢靠近，暖光停在主体上。",
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
  "prompt": "前 5 秒镜头环绕产品，中间 5 秒灯光慢慢变亮，最后 5 秒拉远，背景保持浅米色。",
  "seconds": 15,
  "aspect_ratio": "16:9",
  "resolution": "720p",
  "reference_image_urls": [
    "https://example.com/ref-1.png",
    "https://example.com/ref-2.png"
  ]
}
```

多图之间尽量保持主体、风格或场景相关。提示词必须带时间，并且落在片长内。同时写清镜头运动、主体动作、灯光和场景变化。

## 预设音色

`reference_audios` 可选。不传就不要带这个字段。传了才指定音色。一次最多 3 个。没有单独的绑定字段，靠提示词编号对上：

- `reference_audios[0]` = `<AUDIO_0>`
- `reference_audios[1]` = `<AUDIO_1>`
- `reference_audios[2]` = `<AUDIO_2>`
- 人物用 `<IMAGE_0>`、`<IMAGE_1>`。若另外传了首帧 `image`，它占 `<IMAGE_0>`，参考图从 `<IMAGE_1>` 开始。

```json
{
  "model": "grok-video",
  "prompt": "女主来自 <IMAGE_0>，用 <AUDIO_0> 的声音。0 到 5 秒她说「不要靠近」。5 到 10 秒另一人用 <AUDIO_1> 的声音靠近，她躲开。",
  "duration": 10,
  "reference_image_urls": [
    "https://example.com/person.png"
  ],
  "reference_audios": [
    { "voice_id": "eve" },
    { "voice_id": "leo" }
  ]
}
```

`voice_id` 大小写不敏感。视频模型不收 `aurora`、`liora`。其余公开预设：

`carina，zagan，helix，orion，luna，iris，altair，zenith，perseus，helios，lux，kepler，rigel，cosmo，celeste，ursa，sirius，lumen，castor，naksh，atlas，ara，eve，leo，rex，sal`

默认配音不用传这个字段，模型会自己出声。要锁音色才传。自己的音频文件不能当视频参考声，那是合作方申请项。

试听没有官方样音包，官方 GitHub 也不放 mp3。页面播放在 <https://x.ai/api/voice>。要落成本地文件，打 `POST /v1/tts` 自己存。

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

## TODO

- 线上 Grok Native 尚未发布 `reference_audios` 转发。本地组包已接，不传不写字段；发版前线上仍会丢掉。
- 没有官方样音包。试听包未做。
- 页面「参考视频」「参考音频」当前生成用不上，未改。
- 分组说明尚未写入本节。
