#!/usr/bin/env bash
set -euo pipefail

# gpt-image-2 生图调用脚本
# 要求：API Key 必须属于「GPT 生图高级版（1K/2K）」分组。
# 用法：
#   SUBLB_API_KEY='sk-...' ./gpt-image-2-generate.sh '一只白色小狗，干净背景'
#   ./gpt-image-2-generate.sh '一只白色小狗，干净背景' '2048x2048' 'out.json'

BASE_URL="${BASE_URL:-https://sub-lb.tap365.org}"
API_KEY="${SUBLB_API_KEY:-}"
MODEL="gpt-image-2"
PROMPT="${1:-一只白色小狗，干净背景}"
SIZE="${2:-1024x1024}"
OUT_JSON="${3:-gpt-image-2-response.json}"

if [[ -z "$API_KEY" ]]; then
  echo "错误：请先设置 SUBLB_API_KEY。该 key 必须属于 GPT 生图高级版（1K/2K）分组。" >&2
  echo "示例：SUBLB_API_KEY='sk-...' $0 '一只白色小狗，干净背景'" >&2
  exit 2
fi

# 禁用本机代理，避免误走 7890。
export NO_PROXY='*'
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy

models_json="$(curl --noproxy '*' -sS "$BASE_URL/v1/models" \
  -H "Authorization: Bearer $API_KEY")"

if ! printf '%s' "$models_json" | grep -q '"id"[[:space:]]*:[[:space:]]*"gpt-image-2"'; then
  echo "错误：当前 API Key 的模型列表不包含 gpt-image-2。" >&2
  echo "请使用 GPT 生图高级版（1K/2K）分组的 key，不要使用 spark/pro/standard/ultra/super/start 分组 key。" >&2
  echo "$models_json" > "models-check-failed.json"
  echo "模型列表响应已保存：models-check-failed.json" >&2
  exit 3
fi

payload="$(node -e 'console.log(JSON.stringify({model: process.argv[1], prompt: process.argv[2], size: process.argv[3], response_format: "url"}))' "$MODEL" "$PROMPT" "$SIZE")"

curl --noproxy '*' -sS "$BASE_URL/v1/images/generations" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  -o "$OUT_JSON"

echo "完成：响应已保存到 $OUT_JSON"
echo "如需查看图片 URL：grep -o 'https://[^\" ]*' '$OUT_JSON' | head"
