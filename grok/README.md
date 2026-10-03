# Grok 视频接入

## 1. 先说结论

对外建议只保留这 2 个视频模型：

| 模型 | 用途 |
|---|---|
| `grok-image-video` | 图生视频 / 文生视频 |
| `grok-video-1.5` | 单图生视频 |

注意：`GET /v1/models` 只能说明模型可见，**不等于对应业务接口一定稳定可用**。

---

## 2. 价格口径

### 2.1 官方成本口径（xAI 官方，2026-07-08 核对）

`grok-video-1.5` 对应官方 `grok-imagine-video-1.5`，是**按秒 + 输入图**计费：

- 输入图：`$0.01 / 张`
- 480p：`$0.08 / 秒`
- 720p：`$0.14 / 秒`
- 1080p：`$0.25 / 秒`

按 15 秒估算：

| 分辨率 | 官方成本（USD） | 约合人民币* |
|---|---:|---:|
| 480p | `$1.21 / 条` | `约 ¥8.7 / 条` |
| 720p | `$2.11 / 条` | `约 ¥15.1 / 条` |
| 1080p | `$3.76 / 条` | `约 ¥27.0 / 条` |

`grok-image-video` 更像通用视频能力，按前面评估口径可以先按下面理解：

| 分辨率 | 15 秒官方输出成本（USD） | 约合人民币* |
|---|---:|---:|
| 480p | `$0.75 / 条` | `约 ¥5.4 / 条` |
| 720p | `$1.05 / 条` | `约 ¥7.5 / 条` |

\* 汇率按 `$1 ≈ ¥7.17` 粗算，实际会波动。

---

## 3. 已实测结果

基于 `https://YOUR_SUBLB_DOMAIN` 的实测，当前可以直接记住：

| 模型 | 实测结果 | 风险提醒 |
|---|---|---|
| `grok-imagine-image-2.0` | 生图已跑通，返回 `data[0].url` | 推荐默认图片模型 |
| `grok-imagine-image-quality` | 旧默认，兼容保留 | 不要当新默认 |
| `grok-imagine-image` | 生图不稳定，编辑未跑通 | 不要当默认 |
| `grok-image-video` | 真出视频成功 | **先按 4 秒卖** |
| `grok-video-1.5` | 真能出视频 | 请求 15 秒时，实际返回 4 秒过，参数兑现不稳定 |

所以对外不要先写“稳定 15 秒”，先写成：

- Grok 图生视频
- 4 秒起
- 480p / 720p 可选
- 单图参考更稳

---

## 4. 接口基础信息

Base URL:

```text
https://YOUR_SUBLB_DOMAIN
```

认证方式：

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

常用接口：

| 能力 | 接口 |
|---|---|
| 模型列表 | `GET /v1/models` |
| 图片生成 | `POST /v1/images/generations` |
| 创建视频任务 | `POST /v1/videos/generations` |
| 查询视频任务 | `GET /v1/videos/{task_id}` |
| 下载视频内容 | `GET /v1/videos/{task_id}/content` |

视频生成是**异步任务**：先拿 `task_id` / `request_id`，再轮询结果。  
**不要**把视频模型打到 `/v1/chat/completions` 或 `/v1/responses`（上游会直接拒：video model not available on this endpoint）。

### 4.1 画幅与分辨率（竖屏怎么传）

**结论先说：上游支持竖屏；不要用 OpenAI 生图那套 `size: "720x1280"` 像素串。**

| 参数 | 用途 | 推荐值 |
|---|---|---|
| `aspect_ratio` | 画幅（横/竖/方） | 见下表 |
| `resolution` | 清晰度档位 | `480p` / `720p` / `1080p` |
| `duration` 或 `seconds` | 时长（秒） | 建议 `1–15`；对外更稳可先按 4 秒卖 |

`aspect_ratio` 官方支持（xAI Grok Imagine Video）：

| aspect_ratio | 画幅 | 常见用途 |
|---|---|---|
| `16:9` | 横屏 | 默认；商品横版、网页 |
| `9:16` | **竖屏** | 抖音 / 小红书 / Stories |
| `1:1` | 方图 | 社媒缩略 |
| `4:3` / `3:4` | 横/竖 | 演示、人像 |
| `3:2` / `2:3` | 横/竖 | 摄影画幅 |

`resolution`：

| resolution | 说明 |
|---|---|
| `480p` | 默认档，更快更便宜 |
| `720p` | 日常成片推荐 |
| `1080p` | 更高清（`grok-video-1.5` / 官方 `grok-imagine-video-1.5` 文生/图生可用；参考图模式可能封顶 720p） |

#### 竖屏正确示例（推荐）

```json
{
  "model": "grok-video-1.5",
  "prompt": "暖光客厅边桌一角，陶瓷小猫摆件，镜头缓慢推近",
  "duration": 6,
  "aspect_ratio": "9:16",
  "resolution": "720p",
  "image_url": "https://example.com/product.jpg"
}
```

#### 禁止 / 易踩坑

| 写法 | 结果 | 原因 |
|---|---|---|
| `"size": "720x1280"` | 上游 **422**，网关常表现为 **502**，客户端拿不到 task_id | `size` 像素枚举**不认竖屏对**；不是「上游不能出竖屏」 |
| `"size": "480x848"` | 同上 | 同上 |
| `"size": "240p"` | 422 | `size` 不是分辨率档位；档位用 `resolution` |
| `"size": "1280x720"` 等横屏像素 | 部分链路可过 | 仍不推荐；统一用 `aspect_ratio` + `resolution` |
| 视频模型打 `/v1/responses` | 400/502 | 必须用 `/v1/videos/generations` |
| `duration` > 15 | 上游拒 | 单次 1–15 秒 |
| `grok-video-1.5` 不带图 | 本地/上游拒 | 单图生视频需要 `image_url` |

若错误信息类似：

```text
size: unknown variant `720x1280`, expected one of `848x480`, `1696x960`, `1280x720`, `1920x1080`
```

说明请求把竖屏写成了 **`size` 像素串**。改成 **`aspect_ratio: "9:16"` + `resolution: "720p"`** 即可，无需换 key、换套餐。

图片接口的 `size`（如 `720x1280` 生图）与**视频**参数不是同一套，不要混用。

---

## 5. 视频对接方式

### 5.1 创建任务（竖屏文生示例）

```bash
curl -X POST "https://YOUR_SUBLB_DOMAIN/v1/videos/generations" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-image-video",
    "prompt": "A cinematic 9:16 video of a cat running through warm sunlight.",
    "duration": 4,
    "aspect_ratio": "9:16",
    "resolution": "720p"
  }'
```

### 5.2 单图生视频（横屏）

```bash
curl -X POST "https://YOUR_SUBLB_DOMAIN/v1/videos/generations" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-video-1.5",
    "prompt": "Use the reference image as the main subject and create a smooth cinematic motion.",
    "duration": 4,
    "aspect_ratio": "16:9",
    "resolution": "480p",
    "image_url": "https://YOUR_SUBLB_DOMAIN/reference.png"
  }'
```

图生视频也可不传 `aspect_ratio`：输出默认跟随参考图比例；若要强制竖屏，显式写 `"aspect_ratio": "9:16"`。

### 5.3 查询任务 / 下载

```bash
curl -X GET "https://YOUR_SUBLB_DOMAIN/v1/videos/{task_id}" \
  -H "Authorization: Bearer <YOUR_API_KEY>"

curl -X GET "https://YOUR_SUBLB_DOMAIN/v1/videos/{task_id}/content" \
  -H "Authorization: Bearer <YOUR_API_KEY>" \
  -o output.mp4
```

成功时重点看：

- 状态为 `SUCCESS` / `completed` / `done` 等完成态
- 有可下载的 `result_url` 或 content 接口返回 mp4

不要只看 `progress: "100%"`，因为**失败任务也可能显示 100%**。  
提交阶段若被拒（如错误 `size`），响应里**不会有 task_id**，客户端会表现为「视频服务拒绝提交 / 未取得任务编号」。

---

## 6. 对接 demo（Node / fetch）

完整可跑脚本见同目录 `video-demo.mjs`。最小示例：

```js
const BASE_URL = 'https://YOUR_SUBLB_DOMAIN'
const API_KEY = process.env.VIDEO_API_KEY

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createGrokVideo() {
  const createResp = await fetch(`${BASE_URL}/v1/videos/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-image-video',
      prompt: 'A cinematic 9:16 video of a cat running through warm sunlight.',
      duration: 4,
      aspect_ratio: '9:16',
      resolution: '720p',
    }),
  })

  const created = await createResp.json()
  if (!createResp.ok) throw new Error(JSON.stringify(created))

  const taskId = created.task_id || created.request_id || created.id
  if (!taskId) throw new Error('missing task_id')

  for (let i = 0; i < 60; i += 1) {
    await sleep(5000)

    const pollResp = await fetch(`${BASE_URL}/v1/videos/${taskId}`, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    })
    const result = await pollResp.json()
    if (!pollResp.ok) throw new Error(JSON.stringify(result))

    const state = String(result.status || result.data?.status || '').toLowerCase()
    if (['success', 'succeeded', 'completed', 'done'].includes(state)) {
      return result
    }
    if (['failure', 'failed', 'error'].includes(state)) {
      throw new Error(JSON.stringify(result))
    }
  }

  throw new Error(`timeout: ${taskId}`)
}
```

环境变量示例：`VIDEO_ASPECT_RATIO=9:16` `VIDEO_RESOLUTION=720p`（见 `video-demo.mjs`）。

---

## 7. 接入注意事项

1. **不要把视频能力写成同步接口。** 这是异步任务。
2. **不要只依赖 `/v1/models` 判定可用性。** 必须真调业务接口。
3. **不要先承诺稳定 15 秒。** 当前更稳的卖法是先按 4 秒卖。
4. `grok-video-1.5` **需要单图参考**（`image_url`），不支持多图；纯文生优先 `grok-image-video` / `grok-video`。
5. `grok-image-video` 多参考图最多 7 张，且多图最长约 10 秒。
6. **竖屏用 `aspect_ratio: "9:16"`，不要用 `size: "720x1280"`。** 后者会被上游 422 拒绝。
7. 视频只走 **`POST /v1/videos/generations`**，不要打文本端点。
8. `result_url` / content 多为临时直链，建议任务成功后立即下载落库。
9. 参考图必须是公网 HTTPS 直链，不能依赖登录、Cookie、防盗链。
10. 平台展示价和官方真实成本不是一回事；如果后台看到低得离谱的价格，先核实是不是渠道补贴价或按次价。
