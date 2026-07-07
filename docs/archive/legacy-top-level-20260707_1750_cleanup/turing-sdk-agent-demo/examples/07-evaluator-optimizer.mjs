import { createTuringClient } from "turing-sdk";
import { parseJsonObject } from "../lib/shared-safety.mjs";

function pickProvider() {
  if (process.env.OPENAI_API_KEY) return { preset: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1", model: process.env.OPENAI_MODEL || "gpt-5.4", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.GROK_API_KEY) return { preset: "grok", baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1", model: process.env.GROK_MODEL || "grok-4.3", apiKey: process.env.GROK_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { preset: "openai", baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY };
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const client = createTuringClient({
  ...pickProvider(),
  transport: "chat_completions",
  protocol: "openai_chat_completions",
  timeoutMs: 120_000,
});

const task = process.argv.slice(2).join(" ") || "写一段给新手看的 turing-sdk 接入说明";
const maxRounds = 2;
let draft = (await client.query(`请先完成这个任务，要求简洁、准确、可直接使用：${task}`)).text.trim();

for (let round = 1; round <= maxRounds; round++) {
  const review = await client.query(`你是严格评审。只输出 JSON，不要 markdown。格式：{"score":0-10,"issues":["最多三个必须修改点"]}\n\n任务：${task}\n\n草稿：\n${draft}`);
  const meta = parseJsonObject(review.text, { score: 0, issues: [review.text.trim()] });
  const score = Number(meta.score || 0);
  console.log(`\n[Review round ${round}]\n` + JSON.stringify(meta, null, 2));
  if (score >= 9) break;

  draft = (await client.query(`请根据评审意见改写草稿。只输出改写后的最终版本。\n\n任务：${task}\n\n原草稿：\n${draft}\n\n评审：\n${JSON.stringify(meta)}`)).text.trim();
}

console.log("\n[Final]\n" + draft);
