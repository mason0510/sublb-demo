const BASE_URL = process.env.VIDEO_BASE_URL || "https://chainfuel.tap365.org";
const API_KEY = process.env.VIDEO_API_KEY;

if (!API_KEY) throw new Error("请设置 VIDEO_API_KEY");

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const task = await request("/v1/videos", {
    method: "POST",
    body: JSON.stringify({
      model: process.env.VIDEO_MODEL || "grok-video",
      prompt: "A small white cube rotates slowly on a dark studio background.",
      seconds: 3,
      aspect_ratio: "16:9",
    }),
  });

  console.log("提交结果:", task);

  const taskId =
    task.task_id ||
    task.request_id ||
    task.id ||
    task.data?.task_id ||
    task.data?.request_id ||
    task.data?.id;

  if (!taskId) throw new Error("响应中没有任务 ID");

  for (let attempt = 0; attempt < 240; attempt += 1) {
    await sleep(3000);

    const status = await request(`/v1/videos/${encodeURIComponent(taskId)}`);
    console.log("状态:", status);

    const state = String(
      status.status || status.state || status.data?.status || "",
    ).toLowerCase();

    if (["completed", "complete", "succeeded", "success", "done", "finished"].includes(state)) {
      break;
    }

    if (["failed", "failure", "error", "cancelled", "canceled"].includes(state)) {
      throw new Error(`视频生成失败: ${JSON.stringify(status)}`);
    }

    if (attempt === 239) throw new Error("视频生成轮询超时");
  }

  const response = await fetch(
    `${BASE_URL}/v1/videos/${encodeURIComponent(taskId)}/content`,
    { headers: { Authorization: `Bearer ${API_KEY}` } },
  );

  if (!response.ok) {
    throw new Error(`下载失败: ${response.status} ${await response.text()}`);
  }

  const video = Buffer.from(await response.arrayBuffer());
  await import("node:fs/promises").then((fs) => fs.writeFile("output.mp4", video));
  console.log("视频已保存: output.mp4");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
