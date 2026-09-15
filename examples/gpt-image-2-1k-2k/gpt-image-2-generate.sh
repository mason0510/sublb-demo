#!/usr/bin/env bash
set -euo pipefail

# gpt-image-2 / gpt-image-2.5 生图
# 要求：API Key 属于图片生成/编辑分组。
# 用法：
#   SUBLB_API_KEY='sk-...' ./gpt-image-2-generate.sh '一只白色小狗，干净背景'
#   MODEL=gpt-image-2.5-flare ./gpt-image-2-generate.sh '一只白色小狗，干净背景' '1024x1024' 'flare.json'

BASE_URL="${BASE_URL:-https://sub-lb.tap365.org}"
API_KEY="${SUBLB_API_KEY:-}"
MODEL="${MODEL:-gpt-image-2}"
PROMPT="${1:-一只白色小狗，干净背景}"
SIZE="${2:-1024x1024}"
OUT_JSON="${3:-gpt-image-2-response.json}"

ALLOWED_MODELS='gpt-image-2 gpt-image-2-1k gpt-image-2-2k gpt-image-2-4k gpt-image-2.5 gpt-image-2.5-flare gpt-image-2.5-sunburst'

if [[ -z "$API_KEY" ]]; then
  echo "错误：请先设置 SUBLB_API_KEY。该 key 必须属于图片生成/编辑分组。" >&2
  echo "示例：SUBLB_API_KEY='sk-...' MODEL=gpt-image-2.5-flare $0 '一只白色小狗，干净背景'" >&2
  exit 2
fi

if ! printf '%s' " $ALLOWED_MODELS " | grep -q " $MODEL "; then
  echo "错误：不支持的模型 $MODEL" >&2
  echo "可选：$ALLOWED_MODELS" >&2
  exit 2
fi

export NO_PROXY='*'
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy

models_json="$(curl --noproxy '*' -sS "$BASE_URL/v1/models" \
  -H "Authorization: Bearer $API_KEY")"

if ! printf '%s' "$models_json" | grep -q "\"id\"[[:space:]]*:[[:space:]]*\"$MODEL\""; then
  echo "错误：当前 API Key 的模型列表不包含 $MODEL。" >&2
  echo "请使用图片生成/编辑分组的 key。" >&2
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

echo "完成：模型 $MODEL，响应已保存到 $OUT_JSON"
echo "url 可能是 https://... 或 data:image/png;base64,..."
