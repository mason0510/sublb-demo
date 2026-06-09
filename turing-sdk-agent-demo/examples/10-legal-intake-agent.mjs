import { createTuringClient } from "turing-sdk";
import { looksLikeLegalAdviceRequest, parseJsonObject } from "../lib/shared-safety.mjs";

function pickProvider() {
  if (process.env.OPENAI_API_KEY) return { preset: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1", model: process.env.OPENAI_MODEL || "gpt-5.4", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.GROK_API_KEY) return { preset: "grok", baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1", model: process.env.GROK_MODEL || "grok-4.3", apiKey: process.env.GROK_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { preset: "openai", baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY };
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const facts = process.argv.slice(2).join(" ") || "客户说：供应商拖欠货款 38 万，合同约定 2026-05-01 付款，对方一直以验收没完成为由拖延。客户有合同、送货单、微信催款记录。";
const boundary = `边界：这是律师助手 intake，不是 AI 律师；不提供正式法律意见；不判断胜诉率；不承诺结果；不替客户决定诉讼策略；所有输出仅供律师内部初步整理，需执业律师复核。`;

if (looksLikeLegalAdviceRequest(facts)) {
  console.log(`[拒绝越界]\n${boundary}\n\n你提供的问题包含法律意见、胜诉率或诉讼策略请求。这个示例只能整理事实、证据和待补材料。请把材料改成事实描述后再运行，正式判断交由执业律师完成。`);
  process.exit(0);
}

const client = createTuringClient({ ...pickProvider(), transport: "chat_completions", protocol: "openai_chat_completions", timeoutMs: 120_000, systemPrompt: boundary });

const intake = await client.query(`只输出 JSON，不要 markdown。格式：{"case_type":"...","timeline":["..."],"evidence":["..."],"missing_info":["..."],"risk_flags":["..."]}\n要求：只整理事实、证据、待问问题，不给法律结论。\n\n事实材料：${facts}`);
const parsed = parseJsonObject(intake.text, { raw: intake.text.trim() });

const memo = await client.query(`请基于 intake 结果生成一份律师内部初步备忘录。\n必须包含免责声明：仅供律师内部初步整理，需执业律师复核。\n只列事实、证据、待补材料、可能的检索方向；不承诺结果，不写胜诉保证。\n\n原始事实：${facts}\n\nIntake：${JSON.stringify(parsed)}`);

console.log("[Facts]\n" + facts);
console.log("\n[Intake]\n" + JSON.stringify(parsed, null, 2));
console.log("\n[Internal Legal Memo]\n" + memo.text.trim());
