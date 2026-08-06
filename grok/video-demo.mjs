const BASE_URL = process.env.VIDEO_BASE_URL || "https://YOUR_SUBLB_DOMAIN";
const API_KEY = process.env.VIDEO_API_KEY;
const VIDEO_SECONDS = Number(process.env.VIDEO_SECONDS || 3);
const VIDEO_ASPECT_RATIO = process.env.VIDEO_ASPECT_RATIO || "16:9";
const VIDEO_RESOLUTION = process.env.VIDEO_RESOLUTION || "480p";
const REFERENCE_IMAGES = (process.env.VIDEO_REFERENCE_IMAGES || "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

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

function createVideoRequest() {
  const body = {
    model: process.env.VIDEO_MODEL || (REFERENCE_IMAGES.length > 1 ? "grok-image-video" : "grok-video"),
    prompt: process.env.VIDEO_PROMPT || "A small white cube rotates slowly on a dark studio background.",
    aspect_ratio: VIDEO_ASPECT_RATIO,
    resolution: VIDEO_RESOLUTION,
  };
  if (REFERENCE_IMAGES.length > 1) body.seconds = VIDEO_SECONDS;
  else body.duration = VIDEO_SECONDS;
  if (REFERENCE_IMAGES.length === 1) body.image_url = REFERENCE_IMAGES[0];
  if (REFERENCE_IMAGES.length > 1) {
    body.reference_images = REFERENCE_IMAGES.slice(0, 7).map((url) => ({ url }));
  }
  return body;
}

async function main() {
  const task = await request("/v1/videos/generations", {
    method: "POST",
    body: JSON.stringify(createVideoRequest()),
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
