# gpt-image-2 生图调用示例（1K/2K）

本目录演示如何使用 SubLB OpenAI-compatible Images API 调用 `gpt-image-2`。

## 前提

API Key 必须属于：`GPT 生图高级版（1K/2K）` 分组。

请不要使用 `spark`、`pro`、`standard`、`ultra`、`super`、`start` 等普通分组 key 调用 `gpt-image-2`。

## 文件

- `gpt-image-2-generate.sh`：最小调用脚本，会先检查 `/v1/models` 是否包含 `gpt-image-2`。
- `gpt-image-2-response.json`：一次调用返回示例。

## 使用方法

```bash
cd examples/gpt-image-2-1k-2k

SUBLB_API_KEY='sk-你的GPT生图高级版1K2K分组key' \
./gpt-image-2-generate.sh '一只白色小狗，干净背景，柔和自然光，写实摄影风格，高清细节' '1024x1024' 'gpt-image-2-response.json'
```

2K 示例：

```bash
SUBLB_API_KEY='sk-你的GPT生图高级版1K2K分组key' \
./gpt-image-2-generate.sh '极简科技感产品海报，白色背景，银色智能音箱，柔和阴影，高级商业摄影风格' '2048x2048' 'poster-2k.json'
```

## 推荐提示词

```text
一只白色小狗坐在干净的浅灰色背景前，柔和自然光，真实摄影风格，毛发细节清晰，画面简洁，高级感，高清
```

## 脚本会测试什么

1. `GET /v1/models`：确认当前 key 的模型白名单包含 `gpt-image-2`。
2. `POST /v1/images/generations`：发起一次真实生图请求。

脚本不会测试图片编辑、4K 分组、其他模型或图片真实像素尺寸。
