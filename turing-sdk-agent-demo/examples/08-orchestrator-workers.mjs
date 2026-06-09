import { createTuringClient } from "turing-sdk";
import { parseJsonArray } from "../lib/shared-safety.mjs";

function pickProvider() {
  if (process.env.GROK_API_KEY) return { preset: "grok", baseUrl: process.env.GROK_BASE_URL || "https://api.tap365.org/v1", model: process.env.GROK_MODEL || "grok-4.3", apiKey: process.env.GROK_API_KEY };
  if (process.env.OPENAI_API_KEY) return { preset: "openai", baseUrl: process.env.OPENAI_BASE_URL || "https://api.tap365.org/v1", model: process.env.OPENAI_MODEL || "gpt-5.4", apiKey: process.env.OPENAI_API_KEY };
  if (process.env.DEEPSEEK_API_KEY) return { preset: "openai", baseUrl: process.env.DEEPSEEK_BASE_URL || "https://sub-lb.tap365.org", model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro", apiKey: process.env.DEEPSEEK_API_KEY };
  throw new Error("至少需要配置 OPENAI_API_KEY / GROK_API_KEY / DEEPSEEK_API_KEY 中的一个");
}

const client = createTuringClient({ ...pickProvider(), transport: "chat_completions", protocol: "openai_chat_completions", timeoutMs: 120_000 });
const task = process.argv.slice(2).join(" ") || "为 turing-sdk-agent-demo 设计三个真实可运行的 Agent 示例";

async function splitJobs() {
  const prompt = `你是 Orchestrator。把任务拆成 3 个互相独立的 worker 子任务。只输出 JSON 数组，不要 markdown。每项格式：{"name":"worker-name","prompt":"子任务"}\n任务：${task}`;
  const first = await client.query(prompt);
  let jobs = parseJsonArray(first.text, []);
  if (jobs.length === 0) {
    const repaired = await client.query(`把下面内容修复成合法 JSON 数组，只保留 name 和 prompt 字段：\n${first.text}`);
    jobs = parseJsonArray(repaired.text, []);
  }
  if (jobs.length === 0) {
    jobs = [
      { name: "user-value", prompt: `从用户视角分析：${task}` },
      { name: "engineering", prompt: `从工程实现视角分析：${task}` },
      { name: "risk-acceptance", prompt: `从风险和验收视角分析：${task}` },
    ];
  }
  return jobs.slice(0, 3).map((job, index) => ({ name: String(job.name || `worker-${index + 1}`), prompt: String(job.prompt || task) }));
}

const jobs = await splitJobs();
console.log("[Jobs]");
for (const job of jobs) console.log(`- ${job.name}: ${job.prompt}`);

const workerResults = await Promise.all(jobs.map(async (job) => {
  const res = await client.query(`你是 ${job.name}。请完成子任务，输出要点，不要超过 5 条。\n${job.prompt}`);
  return { name: job.name, text: res.text.trim() };
}));

const synthesis = await client.query(`你是 Synthesizer。请合并多个 worker 的结果，给出最终可执行结论。\n\n原始任务：${task}\n\nworker 结果：\n${workerResults.map((r) => `## ${r.name}\n${r.text}`).join("\n\n")}`);

console.log("\n[Worker Results]");
for (const r of workerResults) console.log(`\n## ${r.name}\n${r.text}`);
console.log("\n[Synthesis]\n" + synthesis.text.trim());
