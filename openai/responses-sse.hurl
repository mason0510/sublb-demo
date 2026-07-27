# OpenAI Responses API SSE smoke test.
#
# Run with:
#   hurl --test --variables-file .env.hurl responses-sse.hurl
#
# .env.hurl must define only:
#   sublb_base_url=https://sub-lb.tap365.org
#   sublb_api_key=YOUR_SUBLB_API_KEY
#
# Keep .env.hurl local. Never commit a real API key.
POST {{sublb_base_url}}/v1/responses
Authorization: Bearer {{sublb_api_key}}
Content-Type: application/json
Accept: text/event-stream

{
  "model": "{{sublb_model}}",
  "input": "只回复 SUBLB_SSE_OK",
  "stream": true,
  "store": false,
  "max_output_tokens": 32
}

HTTP 200
[Asserts]
header "content-type" contains "text/event-stream"
body contains "data:"
body contains "SUBLB_SSE_OK"
body contains "event: response.completed"
body contains "\"status\":\"completed\""
