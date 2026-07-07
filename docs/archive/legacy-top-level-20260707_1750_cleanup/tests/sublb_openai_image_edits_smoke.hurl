# SubLB OpenAI 图片专项 smoke cases
# 运行示例：
# hurl --test \
#   --variable base_url=https://sub-lb.tap365.org/v1 \
#   --secret api_key=YOUR_SUBLB_KEY \
#   tests/sublb_openai_image_edits_smoke.hurl

GET {{base_url}}/models
Authorization: Bearer {{api_key}}
Accept: application/json

HTTP 200
[Asserts]
header "content-type" contains "application/json"
jsonpath "$.data" exists

POST {{base_url}}/images/generations
Authorization: Bearer {{api_key}}
Content-Type: application/json
Accept: application/json
{
  "model": "gpt-image-2",
  "prompt": "只生成一个极简蓝色圆角字母 O 图标，白底，测试标记 SUBLB_HURL_GEN_20260503",
  "size": "1024x1024",
  "n": 1
}

HTTP 200
[Asserts]
header "content-type" contains "application/json"
jsonpath "$.data[0].b64_json" exists

POST {{base_url}}/images/edits
Authorization: Bearer {{api_key}}
Accept: application/json
[Multipart]
model: gpt-image-2
prompt: 把这张图改成更明亮的蓝色风格，保留主体构图，测试标记 SUBLB_HURL_EDIT_20260503
image: file,source.png; image/png
size: 1024x1024
response_format: b64_json

HTTP 200
[Asserts]
header "content-type" contains "application/json"
jsonpath "$.data[0].b64_json" exists
