import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createTuringClient } from "turing-sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));

function pickProvider() {
  if (process.env.OPENAI_API_KEY) return { preset: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1", model: process.env.OPENAI_MODEL || "gpt-5.4", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.GROK_API_KEY) return { preset: "grok", baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1", model: process.env.GROK_MODEL || "grok-4.3", apiKey: process.env.GROK_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { preset: "openai", baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY };
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const skillName = process.argv[2] || "customer-support";
const task = process.argv.slice(3).join(" ") || "用户说 503，是不是 key 坏了？";
const allowList = new Set(["customer-support", "legal-intake"]);
if (!allowList.has(skillName)) throw new Error(`未知 skill：${skillName}，允许值：${[...allowList].join(", ")}`);

const skillPath = resolve(__dirname, "..", "skills", `${skillName}.md`);
const skill = await readFile(skillPath, "utf8");
const client = createTuringClient({ ...pickProvider(), transport: "chat_completions", protocol: "openai_chat_completions", timeoutMs: 120_000, systemPrompt: `下面是本应用加载的本地 skill，只作为行为规范使用：\n\n${skill}` });

const res = await client.query(task);
console.log(`[Skill] ${skillName}`);
console.log("[Answer]\n" + res.text.trim());
