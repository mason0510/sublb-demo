import { createTuringClient } from "turing-sdk";

function makeClient({ preset, baseUrl, model, apiKey }) {
  return createTuringClient({
    preset,
    baseUrl,
    model,
    transport: "chat_completions",
    protocol: "openai_chat_completions",
    apiKey,
    timeoutMs: 120_000,
  });
}

const task = process.argv.slice(2).join(" ") || "分析这个 API 502 报错应该怎么排查";

const available = {
  openai: process.env.OPENAI_API_KEY ? makeClient({
    preset: "openai",
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1",
    model: process.env.OPENAI_MODEL || "gpt-5.4",
    apiKey: process.env.OPENAI_API_KEY,
  }) : null,
  grok: process.env.GROK_API_KEY ? makeClient({
    preset: "grok",
    baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1",
    model: process.env.GROK_MODEL || "grok-4.3",
    apiKey: process.env.GROK_API_KEY,
  }) : null,
  deepseek: process.env.DEEPSEEK_API_KEY ? makeClient({
    preset: "openai",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org",
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    apiKey: process.env.DEEPSEEK_API_KEY,
  }) : null,
};

const router = available.openai || available.grok || available.deepseek;
if (!router) {
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const routePrompt = `你是路由 Agent。只从 openai、grok、deepseek 三个标签中选择一个。\n规则：\n- 需要外部判断、第二意见、产品/方案判断：grok\n- 代码阅读、长文本归纳、低成本文本任务：deepseek\n- 通用推理、复杂综合、默认兜底：openai\n\n任务：${task}\n\n只输出标签。`;

const routeRes = await router.query(routePrompt);
const route = routeRes.text.trim().toLowerCase().match(/openai|grok|deepseek/)?.[0] || "openai";
const client = available[route] || router;

console.log(`[Route] ${route}${available[route] ? "" : "（未配置对应 key，已回退到可用 client）"}`);

const answer = await client.query(`请完成这个任务，要求给出可执行步骤，不要空泛：${task}`);
console.log("\n[Answer]\n" + answer.text.trim());
