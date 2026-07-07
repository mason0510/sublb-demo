import { createTuringClient } from "turing-sdk";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("缺少 OPENAI_API_KEY，请先复制 .env.example 为 .env 并导入环境变量");
}

const client = createTuringClient({
  preset: "openai",
  baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1",
  model: process.env.OPENAI_MODEL || "gpt-5.4",
  apiKey,
  timeoutMs: 120_000,
});

const task = process.argv.slice(2).join(" ") || "整理三条 turing-sdk 接入检查项";

const plan = await client.query(`你是一个最小 Agent。请把任务拆成 3 个步骤，只输出编号列表。任务：${task}`);
console.log("\n[Plan]\n" + plan.text.trim());

const result = await client.query(`按下面计划执行并给出最终答案，要求简短可操作。\n任务：${task}\n计划：\n${plan.text}`);
console.log("\n[Result]\n" + result.text.trim());
