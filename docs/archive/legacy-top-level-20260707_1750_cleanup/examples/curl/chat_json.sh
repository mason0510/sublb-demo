#!/usr/bin/env bash
set -euo pipefail

# 演示非流式 /v1/chat/completions 调用。
# 如果网关已做 SSE → JSON 聚合，客户端依然只会拿到普通 JSON。

BASE_URL="${SUBLB_BASE_URL:-}"
API_KEY="${SUBLB_API_KEY:-}"
MODEL="${SUBLB_MODEL:-gpt-5.3-codex}"

if [[ -z "$BASE_URL" || -z "$API_KEY" ]]; then
  echo "错误：请先设置 SUBLB_BASE_URL 和 SUBLB_API_KEY" >&2
  exit 1
fi

header_file="$(mktemp)"
body_file="$(mktemp)"
trap 'rm -f "$header_file" "$body_file"' EXIT

curl -sS \
  -o "$body_file" \
  -D "$header_file" \
  "$BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data-binary @- <<JSON
{
  "model": "$MODEL",
  "stream": false,
  "messages": [
    {"role": "system", "content": "你是一个简洁的助手。"},
    {"role": "user", "content": "请用一句话解释 SSE 转 JSON 聚合的价值。"}
  ]
}
JSON

status_line="$(head -n 1 "$header_file" | tr -d '\r')"
content_type="$(grep -i '^content-type:' "$header_file" | tail -n 1 | cut -d' ' -f2- | tr -d '\r')"

echo "状态行: $status_line"
echo "Content-Type: ${content_type:-<missing>}"
echo

echo "响应 JSON:"
if command -v python3 >/dev/null 2>&1; then
  python3 -m json.tool "$body_file" 2>/dev/null || cat "$body_file"
else
  cat "$body_file"
fi
