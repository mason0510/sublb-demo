# Seedance 视频接入

这份文档只讲 Seedance 视频怎么接、怎么测、怎么避免把“按次价”和“按秒价”搞混。

当前先按用户给出的接入口径整理：

- `as-sd2.0-fast`
- `video-ds-2.0`
- Base URL: `https://zz1cc.cc.cd`

---

## 1. 先说结论

如果后台标价写的是：

- `0.24`
- `0.25`

而且**单位是按次 / 按条**，那它的意思就是：

- **一条视频扣一次**
- **不是按秒扣**

也就是说：

- `0.24 / 条` ≠ `0.24 / 秒`
- `0.25 / 条` ≠ `0.25 / 秒`

这两个口径差非常大，前台卖价、售后承诺、利润计算都会完全不同。

---

## 2. 价格口径怎么理解

### 2.1 如果是按次 / 按条

例如后台写：

- `video-ds-2.0 = 0.24 / 次`
- 或 `as-sd2.0-fast = 0.25 / 次`

那意思就是：

| 模型 | 后台单价 | 正确理解 |
|---|---:|---|
| `video-ds-2.0` | `0.24` | 一条视频一次计费 |
| `as-sd2.0-fast` | `0.25` | 一条视频一次计费 |

此时 15 秒视频如果成功生成，**成本仍然是 0.24 或 0.25 一条**，不是 `15 × 0.24`。

### 2.2 如果以后平台改成按秒

如果某天后台明确写成：

- `0.25 / 秒`

那才是：

- 4 秒 = `1.00`
- 8 秒 = `2.00`
- 10 秒 = `2.50`
- 12 秒 = `3.00`
- 15 秒 = `3.75`

所以第一步永远不是算利润，第一步是**先看清楚单位到底是“次”还是“秒”**。

---

## 3. 接口基础信息

Base URL:

```text
https://zz1cc.cc.cd
```

认证方式：

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

当前已知接口：

| 能力 | 接口 |
|---|---|
| 创建视频任务 | `POST /v1/videos` |
| 查询任务状态 | `GET /v1/videos/{task_id}` |
| 下载结果 | `GET /v1/videos/{task_id}/content` |

---

## 4. 最小请求示例

### 4.1 创建任务

```bash
curl https://zz1cc.cc.cd/v1/videos \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
       "model": "video-ds-2.0",
       "prompt": "A cinematic 9:16 video of a cat running through warm sunlight.",
       "seconds": 15,
       "aspect_ratio": "9:16"
     }'
```

### 4.2 查询任务状态

```bash
curl https://zz1cc.cc.cd/v1/videos/{task_id} \
  -H "Authorization: Bearer $NEW_API_KEY"
```

### 4.3 下载成片

```bash
curl -L https://zz1cc.cc.cd/v1/videos/{task_id}/content \
  -H "Authorization: Bearer $NEW_API_KEY" \
  -o result.mp4
```

---

## 5. 对接 demo（Node / fetch）

```js
const BASE_URL = 'https://zz1cc.cc.cd'
const API_KEY = process.env.NEW_API_KEY

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createSeedanceVideo() {
  const createResp = await fetch(`${BASE_URL}/v1/videos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'video-ds-2.0',
      prompt: 'A cinematic 9:16 video of a cat running through warm sunlight.',
      seconds: 15,
      aspect_ratio: '9:16',
    }),
  })

  const created = await createResp.json()
  if (!createResp.ok) throw new Error(JSON.stringify(created))

  const taskId = created.task_id || created.id || created.data?.task_id
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

    const task = result.data || result
    if (task?.status === 'SUCCESS' || task?.status === 'completed') {
      return `${BASE_URL}/v1/videos/${taskId}/content`
    }
    if (task?.status === 'FAILURE' || task?.status === 'failed') {
      throw new Error(task.fail_reason || JSON.stringify(result))
    }
  }

  throw new Error(`timeout: ${taskId}`)
}
```

---

## 6. 平台接入时建议怎么卖

如果 Seedance 这边后台真的是**按次价很低**，那前台不要照后台原价卖。

建议前台按**成品规格**卖：

| 规格 | 建议对外口径 |
|---|---|
| 15 秒 / 标准版 | 常规款 |
| 15 秒 / Fast | 快速款 |
| 9:16 / 16:9 | 单独做规格选项 |

不要直接把 `0.24`、`0.25` 这种后台成本价暴露给终端用户。

对外更合理的做法是：

1. 写“15 秒标准视频”；
2. 写“标准 / Fast 两档”；
3. 写“竖版 / 横版”；
4. 售价单独设，不跟后台单价一一映射。

---

## 7. 接入注意事项

1. **先确认计费单位。** 这是最重要的事。
2. 不要把“按次价”误算成“按秒价”。
3. `task_id` 要保留，前台查单、补单、售后都靠它。
4. 结果视频建议下载回自己对象存储，不要长期依赖第三方临时地址。
5. 平台接入时前端卖“规格”，后台记“模型 + 秒数 + 比例 + task_id”。
6. 如果以后补充 `resolution`、`image`、`seed`、`watermark` 等参数，再单独扩展文档，不要先乱写死。

---

## 8. 我们自己的平台落地建议

后台字段建议至少留：

- `model`
- `prompt`
- `seconds`
- `aspect_ratio`
- `task_id`
- `status`
- `result_url`
- `cost`
- `billing_mode`（按次 / 按秒）

其中 `billing_mode` 很关键，后面做价格审计、售后对账、利润核算都要靠它。

---

## 9. 当前文档边界

这份文档基于当前已给到的接入样例整理，**重点是把接法和计费口径先锁住**。

如果后面你要继续补：

- 真正返回 JSON 样例
- 失败状态样例
- 模型差异表
- 前台售价表

再在这个目录继续加，不要把后台成本和前台售价混写。
