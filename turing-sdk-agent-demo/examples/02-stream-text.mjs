import { streamText } from "turing-sdk";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY，请先复制 .env.example 为 .env 并导入环境变量");
}

for await (const chunk of streamText("写三条排查建议", {
  preset: "openai",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1",
  model: process.env.OPENAI_MODEL || "gpt-5.4",
  apiKey,
  timeoutMs: 120_000,
})) {
  process.stdout.write(chunk);
}

process.stdout.write("\n");
