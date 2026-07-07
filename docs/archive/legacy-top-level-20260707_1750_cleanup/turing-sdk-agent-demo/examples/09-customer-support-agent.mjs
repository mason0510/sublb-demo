import { createTuringClient } from "turing-sdk";
import { containsFullSecret, parseJsonObject, redactSecrets } from "../lib/shared-safety.mjs";

function pickProvider() {
  if (process.env.OPENAI_API_KEY) return { preset: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1", model: process.env.OPENAI_MODEL || "gpt-5.4", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.GROK_API_KEY) return { preset: "grok", baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1", model: process.env.GROK_MODEL || "grok-4.3", apiKey: process.env.GROK_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { preset: "openai", baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY };
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const client = createTuringClient({ ...pickProvider(), transport: "chat_completions", protocol: "openai_chat_completions", timeoutMs: 120_000 });
const rawTicket = process.argv.slice(2).join(" ") || "用户反馈：turinggrok 输入 hello 后 502，turingdeepseek 读文件时出现 tool call 文本，无法继续。";
const ticket = redactSecrets(rawTicket);

if (containsFullSecret(rawTicket)) {
  console.log("[安全提示]\n检测到工单里包含疑似完整密钥。示例会先脱敏再继续处理；生产系统应直接拒收或自动打码。\n");
}

const standardTemplates = `标准排障模板：\n- 405：优先检查 baseUrl 和 /v1/chat/completions 路径，确认 /v1 没有重复或漏掉。\n- 503：通常是上游账号、额度、调度或 key 侧不可用；不同 provider 的 key 不通用。\n- 502 stream terminal event：先切 chat_completions / openai_chat_completions，并用非流式请求确认。\n- 密钥：不要让用户贴完整 key，只要脱敏前后 4 位、request id、baseUrl、模型和接口路径。`;

const classify = await client.query(`你是客服分诊 Agent。只输出 JSON，不要 markdown。格式：{"category":"billing|key|endpoint|client|usage|other","priority":"low|medium|high","reason":"..."}\n\n${standardTemplates}\n\n工单：${ticket}`);
const meta = parseJsonObject(classify.text, { category: "other", priority: "medium", reason: classify.text.trim() });

const reply = await client.query(`你是 SubLB / Turing 客服 Agent。请基于分诊结果给出可直接发给用户的回复。\n要求：\n- 先安抚，再给 3-5 步排查；\n- 不要要求用户公开粘贴完整 key；\n- 必须使用下面标准模板口径，不要自由发挥成危险建议；\n- 需要用户补充信息时，只要 request id、baseUrl、模型、接口路径、脱敏 key 前后 4 位。\n\n${standardTemplates}\n\n分诊：${JSON.stringify(meta)}\n工单：${ticket}`);

console.log("[Ticket]\n" + ticket);
console.log("\n[Classify]\n" + JSON.stringify(meta, null, 2));
console.log("\n[Customer Reply]\n" + redactSecrets(reply.text.trim()));
