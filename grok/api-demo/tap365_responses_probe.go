// tap365_responses_probe.go
// 将 tap365/Codex 工单拆成独立、可单独运行的探针。
// 只发送测试请求，不执行 function_call，不写入远端资源。
package main

import (
	"bufio"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

type probe struct {
	Name string
	Fn   func() result
}
type result struct {
	Name, Status, Detail, RayID string
	HTTPCode                    int
	DurationMS                  int64
	RequestBytes                int
	StreamComplete              bool
}

var (
	baseURL = strings.TrimRight(env("TAP365_BASE_URL", "https://chainfuel.tap365.org"), "/")
	apiKey  = os.Getenv("TAP365_API_KEY")
	model   = env("TAP365_MODEL", "grok-4.6")
	client  = &http.Client{Timeout: 90 * time.Second}
)

func main() {
	if apiKey == "" {
		fmt.Fprintln(os.Stderr, "请设置 TAP365_API_KEY；不会从参数或代码读取密钥")
		os.Exit(2)
	}
	selected := os.Getenv("TAP365_CASE")
	probes := []probe{
		{"models", testModels},
		{"responses_simple", testResponsesSimple},
		{"responses_sse", testResponsesSSE},
		{"chat_completions_sse", testChatSSE},
		{"responses_one_tool", testResponsesOneTool},
		{"responses_tools_5", func() result { return testResponsesToolCount(5) }},
		{"responses_tools_10", func() result { return testResponsesToolCount(10) }},
		{"responses_tools_20", func() result { return testResponsesToolCount(20) }},
		{"responses_function_history", testResponsesFunctionHistory},
		{"responses_instructions_8k", func() result { return testResponsesLongInstructions(8000) }},
		{"responses_instructions_16k", func() result { return testResponsesLongInstructions(16000) }},
		{"responses_instructions_32k", func() result { return testResponsesLongInstructions(32000) }},
		{"websocket_upgrade", testWebSocketUpgrade},
	}
	for _, p := range probes {
		if selected != "" && selected != p.Name {
			continue
		}
		started := time.Now()
		r := p.Fn()
		r.Name = p.Name
		r.DurationMS = time.Since(started).Milliseconds()
		b, _ := json.Marshal(r)
		fmt.Println(string(b))
	}
}

func testModels() result {
	return doHTTP("GET", "/v1/models", nil, false)
}

func testResponsesSimple() result {
	return doHTTP("POST", "/v1/responses", map[string]any{
		"model": model, "input": "Reply with exactly OK.", "stream": false,
	}, false)
}

func testResponsesSSE() result {
	return doHTTP("POST", "/v1/responses", map[string]any{
		"model": model, "input": "Reply with exactly OK.", "stream": true,
	}, true)
}

func testChatSSE() result {
	return doHTTP("POST", "/v1/chat/completions", map[string]any{
		"model": model, "messages": []any{map[string]any{"role": "user", "content": "Reply with exactly OK."}}, "stream": true,
	}, true)
}

func toolNamed(name string) map[string]any {
	return map[string]any{"type": "function", "name": name, "description": "Return a fixture status.", "parameters": map[string]any{
		"type": "object", "properties": map[string]any{"value": map[string]any{"type": "string"}}, "required": []string{"value"},
	}}
}

func tool() map[string]any { return toolNamed("CHECK_FN") }

func testResponsesToolCount(n int) result {
	tools := make([]any, 0, n)
	for i := 1; i <= n; i++ {
		tools = append(tools, toolNamed(fmt.Sprintf("CHECK_FN_%02d", i)))
	}
	return doHTTP("POST", "/v1/responses", map[string]any{
		"model": model, "instructions": "Reply with exactly OK.", "input": "Use no more than one tool.", "tools": tools, "stream": true,
	}, true)
}

func testResponsesOneTool() result {
	return doHTTP("POST", "/v1/responses", map[string]any{
		"model": model, "instructions": "Use the tool once, then answer.", "input": "Check TARGET.", "tools": []any{tool()}, "stream": true,
	}, true)
}

func testResponsesFunctionHistory() result {
	input := []any{
		map[string]any{"type": "message", "role": "user", "content": "Check TARGET."},
		map[string]any{"type": "function_call", "call_id": "call_1", "name": "CHECK_FN", "arguments": `{"value":"TARGET"}`},
		map[string]any{"type": "function_call_output", "call_id": "call_1", "output": `{"status":"ok"}`},
		map[string]any{"type": "function_call", "call_id": "call_2", "name": "CHECK_FN", "arguments": `{"value":"TARGET-2"}`},
		map[string]any{"type": "function_call_output", "call_id": "call_2", "output": `{"status":"ok-2"}`},
	}
	return doHTTP("POST", "/v1/responses", map[string]any{
		"model": model, "instructions": "Continue from the tool history and reply OK.", "input": input, "tools": []any{tool()}, "stream": true,
	}, true)
}

func testResponsesLongInstructions(bytesTarget int) result {
	long := strings.Repeat("Codex instruction fixture. ", bytesTarget/27+1)
	if len(long) > bytesTarget {
		long = long[:bytesTarget]
	}
	return doHTTP("POST", "/v1/responses", map[string]any{
		// 长 instructions 用例不混入 tools，避免把工具名/Schema 错误误判为长度限制。
		"model": model, "instructions": long, "input": "Reply with exactly OK.", "stream": true,
	}, true)
}

func doHTTP(method, path string, body any, stream bool) result {
	var reader io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reader = strings.NewReader(string(b))
	}
	req, err := http.NewRequest(method, baseURL+path, reader)
	if err != nil {
		return result{Status: "client_error", Detail: err.Error()}
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "text/event-stream")
	resp, err := client.Do(req)
	if err != nil {
		return result{Status: "transport_error", Detail: err.Error()}
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(io.LimitReader(resp.Body, 128*1024))
	complete := !stream || bytesContain(data, []byte("response.completed")) || bytesContain(data, []byte("[DONE]"))
	return result{Status: status(resp.StatusCode), HTTPCode: resp.StatusCode, Detail: compact(string(data)), RayID: resp.Header.Get("CF-RAY"), RequestBytes: requestSize(body), StreamComplete: complete}
}

func requestSize(body any) int {
	if body == nil {
		return 0
	}
	b, _ := json.Marshal(body)
	return len(b)
}
func bytesContain(haystack, needle []byte) bool {
	return strings.Contains(string(haystack), string(needle))
}

func testWebSocketUpgrade() result {
	u := strings.TrimPrefix(strings.TrimPrefix(baseURL, "https://"), "http://")
	host := strings.Split(u, "/")[0]
	if !strings.Contains(host, ":") {
		host += ":443"
	}
	keyBytes := make([]byte, 16)
	_, _ = rand.Read(keyBytes)
	key := base64.StdEncoding.EncodeToString(keyBytes)
	conn, err := tls.DialWithDialer(&net.Dialer{Timeout: 20 * time.Second}, "tcp", host, &tls.Config{ServerName: strings.Split(host, ":")[0]})
	if err != nil {
		return result{Status: "transport_error", Detail: err.Error()}
	}
	defer conn.Close()
	fmt.Fprintf(conn, "GET /v1/responses HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\nAuthorization: Bearer %s\r\n\r\n", host, key, apiKey)
	conn.SetReadDeadline(time.Now().Add(30 * time.Second))
	s := bufio.NewScanner(conn)
	if !s.Scan() {
		return result{Status: "empty_response", Detail: fmt.Sprint(s.Err())}
	}
	line := s.Text()
	code := 0
	fmt.Sscanf(line, "HTTP/1.1 %d", &code)
	detail := line
	for s.Scan() {
		line = s.Text()
		if line == "" {
			break
		}
		if strings.HasPrefix(strings.ToLower(line), "cf-ray:") {
			st := status(code)
			if code == http.StatusSwitchingProtocols {
				st = "upgrade_ok"
			}
			return result{Status: st, HTTPCode: code, Detail: detail, RayID: strings.TrimSpace(strings.SplitN(line, ":", 2)[1])}
		}
	}
	if code == http.StatusSwitchingProtocols {
		return result{Status: "upgrade_ok", HTTPCode: code, Detail: detail}
	}
	return result{Status: status(code), HTTPCode: code, Detail: detail}
}

func status(code int) string {
	if code >= 200 && code < 300 {
		return "ok"
	}
	return "http_error"
}
func compact(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if len(s) > 800 {
		return s[:800] + "…"
	}
	return s
}
func env(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
