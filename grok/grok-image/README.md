# Grok 图片生成与编辑

本目录提供 Grok 图片 API 的开发者对接文档，覆盖：

- 图片生成：`POST /v1/images/generations`
- 图片编辑：`POST /v1/images/edits`
- 模型：`grok-imagine-image`
- 新模型：`grok-imagine-image-2.0`
- 新模型：`grok-imagine-image-quality`
- Cloudflare R2 图片结果转存
- OpenAI-compatible 请求与响应格式
- 参数、字段、错误码、计费、幂等和验收说明

## 文档入口

- [R2_INTEGRATION.md](./R2_INTEGRATION.md)：完整开发对接文档

## 快速入口

### 图片生成

```bash
curl -X POST "https://YOUR_SUBLB_DOMAIN/v1/images/generations" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-imagine-image",
    "prompt": "一只小橘猫坐在蓝色机器人旁边，无文字",
    "n": 1,
    "size": "1024x1024"
  }'
```

### 图片编辑

```bash
curl -X POST "https://YOUR_SUBLB_DOMAIN/v1/images/edits" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "model=grok-imagine-image" \
  -F "prompt=把蓝色圆形改成红色方形，保持背景不变" \
  -F "size=1024x1024" \
  -F "image=@input.png;type=image/png"
```

## 返回结果约定

网关应将上游 `imgen.x.ai` 临时图片 URL 下载后保存到 Cloudflare R2，再向调用方返回 R2 自有 URL：

```json
{
  "data": [
    {
      "url": "https://YOUR_R2_PUBLIC_BASE_URL/images/grok/REQUEST_ID.jpeg",
      "mime_type": "image/jpeg"
    }
  ]
}
```

不要把上游临时 URL 原样暴露给用户。

## 安全提示

- API Key 只通过环境变量或密钥管理系统注入。
- 不要把真实 Key 写入 README、代码、日志或提交记录。
- 图片编辑的 `image` 字段上传真实文件，不要传远程 URL 字符串。
- R2 上传成功后再向客户端返回成功响应。
