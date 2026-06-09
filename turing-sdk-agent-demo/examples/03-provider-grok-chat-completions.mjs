import { createTuringClient } from "turing-sdk";

const apiKey = process.env.GROK_API_KEY;
if (!apiKey) {
  throw new Error("缺少 GROK_API_KEY，请先复制 .env.example 为 .env 并导入环境变量");
}

const grok = createTuringClient({
  preset: "grok",
  baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1",
  model: process.env.GROK_MODEL || "grok-4.3",
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  apiKey,
  timeoutMs: 120_000,
});

const res = await grok.query("只回复 ok");
console.log(res.text);
