import { query } from "turing-sdk";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  throw new Error("缺少 DEEPSEEK_API_KEY，请先复制 .env.example 为 .env 并导入环境变量");
}

const result = await query("只回复 ok", {
  preset: "openai",
  baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org",
  model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  apiKey,
  timeoutMs: 120_000,
});

console.log(result.text);
