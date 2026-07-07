# SubLB OpenAI-compatible smoke cases
# 运行示例：
# hurl --test \
#   --variable base_url=https://sub-lb.tap365.org \
#   --secret api_key=YOUR_SUBLB_KEY \
#   --variable text_model=grok-4.1-fast \
#   tests/sublb_openai_compatible_smoke.hurl

GET {{base_url}}/v1/models
Authorization: Bearer {{api_key}}
Accept: application/json

HTTP 200
[Asserts]
header "content-type" contains "application/json"
jsonpath "$.data" exists

POST {{base_url}}/v1/chat/completions
Authorization: Bearer {{api_key}}
Content-Type: application/json
Accept: application/json
{
  "model": "{{text_model}}",
  "stream": false,
  "messages": [
    {"role": "user", "content": "只回复 SUBLB_HURL_OK"}
  ]
}

HTTP 200
[Asserts]
header "content-type" contains "application/json"
jsonpath "$.choices[0].message.content" contains "SUBLB_HURL_OK"
