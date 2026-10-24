# mason1 语音接口

这个目录只说明 mason1 上两套语音服务怎么调用。

它们不是 SubLB 的 `/v1/chat/completions`，也不是 OpenAI 兼容的 `/v1/audio/*`。调用前先分清方向：

| 方向 | 服务 | 公网入口 | 输入 | 输出 |
|---|---|---|---|---|
| 语音转文字 | Whisper large-v3 | `https://whisper.mwcpool.uk` | 音频 URL 或上传文件 | 文本 |
| 文字转语音 | IndexTTS2 | `https://indextts.mwcpool.uk` | 文本，可选参考音色 | 音频文件 |

不要把录音、转写正文、口播稿、API 密码写进本仓库。示例只用占位句和占位路径。

核对时间：2026-10-24。入口和字段以当天只读探测为准；带认证的转写成功记录来自 2026-09-01 的短音频验收。调用前仍要用自己的短样本再验一次。

---

## 1. 语音转文字

### 1.1 入口和认证

```text
POST https://whisper.mwcpool.uk/upload
POST https://whisper.mwcpool.uk/
GET  https://whisper.mwcpool.uk/
```

公网入口是 HTTP Basic Auth。用户名是 `whisper`。密码只从安全入口读到环境变量，不要写进命令历史后提交。

2026-10-24 未带认证访问 `/`、`/docs`、`/openapi.json` 均返回 HTTP 401，body 为空。这只说明门还在，不说明转写可用。

```bash
export WHISPER_BASIC_USER="whisper"
export WHISPER_BASIC_PASSWORD="从安全入口读取"
```

如果 Basic Auth 已经通过，后端仍返回 401，再补可选头 `x-admin-api-key`。当前公网路径以 Basic Auth 为准。密钥不要写进仓库。

健康检查是 `GET /`，不是 `GET /health`。`GET /` 只代表进程还在。没有真实音频返回 `status=completed` 且 `output.text` 非空，不要当成转写可用。

### 1.2 直接上传

支持扩展名：`.mp3` `.wav` `.m4a` `.ogg` `.aac` `.flac` `.mp4` `.wma` `.opus`。

`/upload` 是同步接口。连接会一直占到这段音频转完。长文件先切段，单段建议不超过 30 分钟。

```bash
curl -sS -w '\nHTTP_STATUS=%{http_code}\n' \
  -u "$WHISPER_BASIC_USER:$WHISPER_BASIC_PASSWORD" \
  -X POST 'https://whisper.mwcpool.uk/upload' \
  -F 'file=@/absolute/path/sample.m4a' \
  -F 'task=transcribe' \
  -F 'language=zh' \
  -F 'batch_size=1' \
  -F 'timestamp=chunk' \
  -F 'diarise_audio=false'
```

不支持的扩展名返回 HTTP 400。处理失败返回 HTTP 500。

### 1.3 用音频 URL 转写

服务端会自己下载 `url`。`url` 必须以 `http` 开头，并且 mason1 那一侧能够访问。不要把只存在于你本机的路径填进来。

```bash
curl -sS -w '\nHTTP_STATUS=%{http_code}\n' \
  -u "$WHISPER_BASIC_USER:$WHISPER_BASIC_PASSWORD" \
  -X POST 'https://whisper.mwcpool.uk/' \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://example.com/sample.mp3",
    "task": "transcribe",
    "language": "zh",
    "batch_size": 5,
    "timestamp": "chunk",
    "diarise_audio": false,
    "is_async": false
  }'
```

字段：

| 字段 | 默认 | 说明 |
|---|---|---|
| `url` | 必填 | 服务端可下载的 http(s) 音频 |
| `task` | `transcribe` | `transcribe` 转写；`translate` 译成英文 |
| `language` | 自动识别 | 中文用 `zh` |
| `batch_size` | `64` | 名称沿用旧接口。2026-09-01 的接口说明里，服务端会把它收成 beam size，并限制在 1 到 5。2026-10-24 未再读源码 |
| `timestamp` | `chunk` | `chunk` 返回片段时间；`word` 额外返回词级时间 |
| `diarise_audio` | `false` | 说话人分离。缺依赖时接口会失败，不要把普通转写说成分离完成 |
| `is_async` | `false` | `true` 时必须同时给 `webhook` |
| `managed_task_id` | 自动生成 | 自定义任务 ID |

成功时 HTTP 200，body 形态：

```json
{
  "output": {
    "text": "转写文本",
    "chunks": [
      {"timestamp": [0.0, 2.5], "text": "转写片段"}
    ],
    "language": "zh",
    "duration": 12.3
  },
  "status": "completed",
  "task_id": "TASK_ID"
}
```

读 `output.text`。`status` 不是 `completed`，或文本为空，都算这次调用没完成。

### 1.4 异步

`is_async=true` 必须带 `webhook`。受理响应是 `status=processing`。完成后服务向 webhook POST 同一份结果。任务结束后再查 `GET /status/{task_id}` 可能是 404，因为完成后会从内存里删掉。以 webhook 的 `completed` 或 `error` 为准。

```json
{
  "url": "https://example.com/sample.mp3",
  "task": "transcribe",
  "language": "zh",
  "timestamp": "chunk",
  "diarise_audio": false,
  "is_async": true,
  "managed_task_id": "sample-001",
  "webhook": {
    "url": "https://example.com/webhook",
    "header": {}
  }
}
```

取消只对后台任务有效：

```bash
curl -sS -u "$WHISPER_BASIC_USER:$WHISPER_BASIC_PASSWORD" \
  -X DELETE 'https://whisper.mwcpool.uk/cancel/sample-001'
```

同步请求不能取消，会返回 HTTP 400。

### 1.5 转写验收

1. 未认证访问得到 401。
2. 带认证用一段你自己的短音频调用 `POST /` 或 `POST /upload`。
3. HTTP 200。
4. `status` 为 `completed`。
5. `output.text` 非空。
6. 记下状态码、耗时、`language`、`duration`。

静音或噪声段可能被模型填上与原话无关的套话。那是识别结果，不是接口失败。正文以你提供的音频为准，本仓库不保存样例转写。

---

## 2. 文字转语音

### 2.1 入口

```text
GET https://indextts.mwcpool.uk/
GET https://indextts.mwcpool.uk/config
GET https://indextts.mwcpool.uk/gradio_api/info
```

这是 Gradio Blocks，不是 OpenAI `/v1/audio/speech`。不要自己拼一套 `/v1/tts`。仓库里没有这条 REST 包装。

2026-10-24 未带密钥访问结果：

| 路径 | HTTP | 说明 |
|---|---|---|
| `/` | 200 | Gradio 页面 HTML |
| `/config` | 200 | Gradio 5.45.0，`api_prefix` 为 `/gradio_api` |
| `/gradio_api/info` | 200 | 两个具名端点 |
| `/info` | 404 | 不是当前入口 |
| `/tester` | 404 | 不是当前入口 |

如果以后未认证访问变成 401，再把密钥放到 `X-API-Key` 或 `Authorization: Bearer`。密钥不要写进仓库。调用前先重新读 `/gradio_api/info`，字段以当时 schema 为准。

### 2.2 端点

当前具名端点只有两个：

| api_name | 用途 |
|---|---|
| `/simple_tts` | 短文本。预设音色优先，也可以另传参考音频 |
| `/advanced_tts` | 参考音频加情绪控制 |

`/simple_tts` 参数：

| 参数 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `text` | 是 | 无 | 要合成的文本 |
| `preset_voice` | 否 | `-- 选择预设音色 --` | 2026-10-24 可见选项还有 `测试音色` |
| `reference_audio` | schema 标为必填 | 无 | 界面文案写可选，且优先级低于预设。只用预设时先传 `None`；客户端拒绝再传一段 wav |

返回一个音频文件路径或文件对象。

`/advanced_tts` 参数：

| 参数 | 必填 | 默认 | 说明 |
|---|---|---|---|
| `text` | 是 | 无 | 要合成的文本 |
| `reference_audio` | 是 | 无 | 音色参考音频 |
| `emotion_mode` | 否 | `same_as_reference` | 还可选 `use_emotion_audio`、`use_emotion_vector` |
| `emotion_audio` | schema 标为必填 | 无 | 情绪参考音频。不用时按客户端要求传空 |
| `emotion_weight` | 否 | `0.65` | 情绪权重 |
| `vec1` 到 `vec8` | 否 | `0` | 依次对应 Happy、Angry、Sad、Fear、Disgust、Melancholy、Surprised、Calm |

参考音频是用来克隆音色或控制情绪的，不是用来识别这段音频里说了什么。识别走第 1 节。

### 2.3 短文本调用

```bash
python3 -m pip install -U gradio_client
```

```python
from gradio_client import Client

client = Client("https://indextts.mwcpool.uk")
result = client.predict(
    text="这是一句接口连通性测试。",
    preset_voice="测试音色",
    reference_audio=None,
    api_name="/simple_tts",
)
print(result)
```

如果未认证被拒绝：

```python
client = Client(
    "https://indextts.mwcpool.uk",
    headers={"X-API-Key": "<INDEXTTS_API_KEY>"},
)
```

拿到文件后用 `ffprobe` 验收。没有时长、大小为 0，都不算合成成功。

```bash
ffprobe -v error \
  -show_entries format=format_name,duration,size \
  -of default=noprint_wrappers=1 \
  OUTPUT_AUDIO
```

### 2.4 长文本

短文本走上面的 Gradio 调用。长文、播客、批量配音不要假设 Gradio 会稳定返回可下载文件。出现下面两类错误时，改到 GPU 主机上分段推理再合并，不要在本机 CPU 上跑长文：

```text
No file URL found in response
error decoding response body
```

分段建议 400 到 800 个中文字，按自然段切开。最终仍用 `ffprobe` 看合并后的音频。

### 2.5 合成验收

1. `GET /gradio_api/info` 能看到 `/simple_tts`。
2. 用一句占位文本生成音频。
3. 返回文件存在，大小大于 0。
4. `ffprobe` 能读出 `duration`。
5. 记下走的是公网 Gradio，还是主机上的分段推理。

页面能打开、`/config` 返回 JSON，都只说明入口还在。

---

## 3. 不要混用

- 要文字：把音频交给 Whisper。
- 要声音：把文字交给 IndexTTS。
- 不要用文本模型的聊天接口探测生图或语音是否可用，这里同理：不要用 Whisper 的 `GET /` 判断 IndexTTS 可用，也不要反过来。
- 本目录不保存任何真实录音和转写正文。
