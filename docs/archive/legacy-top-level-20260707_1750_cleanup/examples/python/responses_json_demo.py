#!/usr/bin/env python3
"""演示如何以非流式 JSON 方式调用 OpenAI-compatible /v1/responses。"""

import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    base_url = os.getenv("SUBLB_BASE_URL", "").rstrip("/")
    api_key = os.getenv("SUBLB_API_KEY", "")
    model = os.getenv("SUBLB_MODEL", "gpt-5.3-codex")

    if not base_url or not api_key:
        print("错误：请先设置 SUBLB_BASE_URL 和 SUBLB_API_KEY", file=sys.stderr)
        return 1

    payload = {
        "model": model,
        "input": "请用一句话解释为什么 SSE 转 JSON 聚合对普通 API 客户端更友好。",
        "stream": False,
    }

    request = urllib.request.Request(
        url=f"{base_url}/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request) as response:
            body = response.read().decode("utf-8")
            status_code = response.status
            content_type = response.headers.get("Content-Type", "")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        status_code = error.code
        content_type = error.headers.get("Content-Type", "")

    print(f"状态码: {status_code}")
    print(f"Content-Type: {content_type}")
    print()
    print("完整响应:")
    parsed = json.loads(body)
    print(json.dumps(parsed, ensure_ascii=False, indent=2))
    print()

    text_output = parsed.get("output", [])
    extracted_text = []
    for item in text_output:
        for content in item.get("content", []):
            text = content.get("text")
            if text:
                extracted_text.append(text)

    if extracted_text:
        print("提取到的文本:")
        print("\n".join(extracted_text))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
