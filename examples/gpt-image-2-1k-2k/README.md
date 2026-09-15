# gpt-image-2 / gpt-image-2.5 生图与编辑示例

本目录演示 SubLB OpenAI-compatible Images API：文生图 `/v1/images/generations`、图片编辑 `/v1/images/edits`。

## 前提

API Key 必须属于图片生成/编辑分组（如 `GPT 生图高级版（1K/2K）` / open-img）。

不要用 `spark`、`pro`、`standard`、`ultra`、`super`、`start` 等普通分组 key。

Base URL 默认 `https://sub-lb.tap365.org`，也可用 `https://chainfuel.tap365.org`。

## 可用模型

| 模型 | 说明 |
|---|---|
| `gpt-image-2` | 默认生图/编辑模型 |
| `gpt-image-2-1k` | 1K 尺寸别名，不保证原生 1024 输出 |
| `gpt-image-2-2k` | 2K 尺寸别名，不保证原生 2048 输出 |
| `gpt-image-2-4k` | 4K 别名；真 4K 需高级版单独验收 |
| `gpt-image-2.5` | 2.5 系列 |
| `gpt-image-2.5-flare` | 2.5 flare |
| `gpt-image-2.5-sunburst` | 2.5 sunburst |

2.5 系列走同一套 Images / Images Edits 接口，把 `model` 换成上表名称即可。

## 文件

- `gpt-image-2-generate.sh`：生图。先检查 `/v1/models` 是否包含目标模型。
- `gpt-image-2-edit.sh`：编辑。`image` 必须是本地 PNG，不能传 URL。
- `gpt-image-2-response.json`：一次生图返回示例。

## 生图

```bash
cd examples/gpt-image-2-1k-2k

SUBLB_API_KEY='sk-你的图片分组key' \
./gpt-image-2-generate.sh '一只白色小狗，干净背景，柔和自然光，写实摄影风格，高清细节' '1024x1024' 'gpt-image-2-response.json'
```

2K：

```bash
SUBLB_API_KEY='sk-你的图片分组key' \
./gpt-image-2-generate.sh '极简科技感产品海报，白色背景，银色智能音箱' '2048x2048' 'poster-2k.json'
```

2.5-flare：

```bash
SUBLB_API_KEY='sk-你的图片分组key' \
MODEL=gpt-image-2.5-flare \
./gpt-image-2-generate.sh '一只白色小狗，干净背景' '1024x1024' 'flare.json'
```

`response_format=url` 时，`data[0].url` 可能是 `https://...`，也可能是 `data:image/png;base64,...`。

## 编辑

```bash
SUBLB_API_KEY='sk-你的图片分组key' \
./gpt-image-2-edit.sh generated.png 'Add a red circle' '1024x1024' 'edit.json'
```

flare 编辑：

```bash
SUBLB_API_KEY='sk-你的图片分组key' \
MODEL=gpt-image-2.5-flare \
./gpt-image-2-edit.sh generated.png 'Add a red circle' '1024x1024' 'flare-edit.json'
```

## 推荐 size（1K=长边 1024，2K=长边 2048）

| 比例 | 1K | 2K |
|---|---|---|
| 1:1 | 1024x1024 | 2048x2048 |
| 3:2 | 1024x683 | 2048x1365 |
| 2:3 | 683x1024 | 1365x2048 |
| 16:9 | 1024x576 | 2048x1152 |
| 9:16 | 576x1024 | 1152x2048 |
| 4:3 | 1024x768 | 2048x1536 |
| 3:4 | 768x1024 | 1536x2048 |
| 21:9 | 1024x439 | 2048x878 |

## 实测摘要

2026-09-15（`https://chainfuel.tap365.org`）：

- `gpt-image-2` + `1024x1024` + `response_format=url`：HTTP 200；url 可能是 data URI；解码后 1024x1024
- 未指定 size 的 `gpt-image-2`：HTTP 200，约 1254x1254
- `gpt-image-2` edits + `1024x1024`：HTTP 200，`b64_json`，约 1254x1254
- `gpt-image-2.5-flare` + `1024x1024` + `response_format=url`：HTTP 200；OSS url；下载后 1254x1254

2026-06-26：`gpt-image-2` 1024x1024 / 2048x2048 均可请求；1024 请求可能返回约 1254x1254，2048 请求可返回 2048x2048。

结论：1K/2K 推荐尺寸可作为请求参数。`gpt-image-2-1k` / `2k` / `4k` 是别名，不要默认当成已验证的原生 1K/2K/4K 输出。真 4K 需单独验收。
