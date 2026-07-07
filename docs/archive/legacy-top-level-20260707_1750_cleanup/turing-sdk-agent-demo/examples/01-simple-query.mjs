import { query } from "turing-sdk";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY，请先复制 .env.example 为 .env 并导入环境变量");
}

const result = await query("只回复 ok", {
  preset: "openai",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1",
  model: process.env.OPENAI_MODEL || "gpt-5.4",
  apiKey,
  timeoutMs: 60_000,
});

console.log(result.text);
