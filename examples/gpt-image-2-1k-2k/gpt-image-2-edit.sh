#!/usr/bin/env bash
set -euo pipefail

# gpt-image-2 / gpt-image-2.5 图片编辑
# image 必须是本地文件，不能传 URL。
# 用法：
#   SUBLB_API_KEY='sk-...' ./gpt-image-2-edit.sh generated.png 'Add a red circle'
#   MODEL=gpt-image-2.5-flare ./gpt-image-2-edit.sh generated.png 'Add a red circle' '1024x1024' 'edit.json'

BASE_URL="${BASE_URL:-https://sub-lb.tap365.org}"
API_KEY="${SUBLB_API_KEY:-}"
MODEL="${MODEL:-gpt-image-2}"
IMAGE_PATH="${1:-}"
PROMPT="${2:-Add a red circle}"
SIZE="${3:-1024x1024}"
OUT_JSON="${4:-gpt-image-2-edit-response.json}"
ALLOWED_MODELS='gpt-image-2 gpt-image-2-1k gpt-image-2-2k gpt-image-2-4k gpt-image-2.5 gpt-image-2.5-flare gpt-image-2.5-sunburst'

if [[ -z "$API_KEY" ]]; then
  echo "错误：请先设置 SUBLB_API_KEY。" >&2
  exit 2
fi

if [[ -z "$IMAGE_PATH" || ! -f "$IMAGE_PATH" ]]; then
  echo "错误：请提供本地图片文件。示例：$0 generated.png 'Add a red circle'" >&2
  exit 2
fi

if ! printf '%s' " $ALLOWED_MODELS " | grep -q " $MODEL "; then
  echo "错误：不支持的模型 $MODEL" >&2
  echo "可选：$ALLOWED_MODELS" >&2
  exit 2
fi

export NO_PROXY='*'
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy

curl --noproxy '*' -sS "$BASE_URL/v1/images/edits" \
  -H "Authorization: Bearer $API_KEY" \
  -F "model=$MODEL" \
  -F "prompt=$PROMPT" \
  -F "image=@${IMAGE_PATH};type=image/png" \
  -F "size=$SIZE" \
  -o "$OUT_JSON"

echo "完成：模型 $MODEL，响应已保存到 $OUT_JSON"
