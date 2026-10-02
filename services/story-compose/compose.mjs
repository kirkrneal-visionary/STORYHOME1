/**
 * One County Story composition.
 * Reads short-lived signed URLs, writes one 1080×1920 MP4, then exits.
 * Does not receive a database password, Supabase service key, or Mux secret.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANVAS_W = 1080;
const CANVAS_H = 1920;
const NEUTRAL = "0xF7F4EC";
const CROP_LIMIT = 0.04;
const FPS = 30;
const MAX_STORY_FRAMES = FPS * 30;
const FRAME_LOCK = "fps=30,setsar=1,settb=1/30,setpts=N/(30*TB)";

function placement(width, height) {
  if (!(width > 0) || !(height > 0)) return "contain";
  const scale = Math.max(CANVAS_W / width, CANVAS_H / height);
  const discardW = Math.max(0, 1 - CANVAS_W / (width * scale));
  const discardH = Math.max(0, 1 - CANVAS_H / (height * scale));
  return discardW <= CROP_LIMIT && discardH <= CROP_LIMIT ? "fill" : "contain";
}

function videoChain(mode, place) {
  if (place === "fill") {
    return `scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=increase,crop=${CANVAS_W}:${CANVAS_H},${FRAME_LOCK}`;
  }
  if (mode === "blur") {
    return [
      "split[fg][bg]",
      `[bg]scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=increase,crop=${CANVAS_W}:${CANVAS_H},boxblur=24:4,eq=brightness=-0.28[bgx]`,
      `[fg]scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=decrease[fgx]`,
      `[bgx][fgx]overlay=(W-w)/2:(H-h)/2,${FRAME_LOCK}`,
    ].join(";");
  }
  return `scale=${CANVAS_W}:${CANVAS_H}:force_original_aspect_ratio=decrease,pad=${CANVAS_W}:${CANVAS_H}:(ow-iw)/2:(oh-ih)/2:color=${NEUTRAL},${FRAME_LOCK}`;
}

function frameCount(durationSec) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("missing duration");
  }
  return Math.max(1, Math.min(MAX_STORY_FRAMES, Math.round(durationSec * FPS)));
}

function secondsText(frames) {
  return (frames / FPS).toFixed(3);
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

function spawnText(command, args) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "inherit"] });
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(chunks).toString("utf8"));
      else reject(new Error(`${command} exited ${code}`));
    });
  });
}

async function probe(file) {
  const stdout = await spawnText("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration:stream=codec_type,width,height",
    "-of",
    "json",
    file,
  ]);
  const parsed = JSON.parse(stdout);
  const streams = Array.isArray(parsed.streams) ? parsed.streams : [];
  const video = streams.find((stream) => stream.codec_type === "video") ?? {};
  return {
    width: Number(video.width) || 0,
    height: Number(video.height) || 0,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    duration: Number(parsed.format?.duration),
  };
}

async function download(url, file) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

function encodeArgs(seconds, output) {
  return [
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-t",
    seconds,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30",
    "-fps_mode",
    "cfr",
    "-video_track_timescale",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-muxdelay",
    "0",
    "-muxpreload",
    "0",
    "-movflags",
    "+faststart",
    output,
  ];
}

async function normalize(file, output, mode, info) {
  const frames = frameCount(info.duration);
  const seconds = secondsText(frames);
  const chain = videoChain(mode, placement(info.width, info.height));
  const audio = info.hasAudio
    ? `[0:a:0]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS,atrim=end=${seconds}[a]`
    : `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=end=${seconds}[a]`;
  const filter = `[0:v]${chain}[v];${audio}`;
  const args = ["-y", "-i", file];
  if (!info.hasAudio) {
    args.push("-f", "lavfi", "-i", `anullsrc=channel_layout=stereo:sample_rate=48000:duration=${seconds}`);
  }
  args.push("-filter_complex", filter, ...encodeArgs(seconds, output));
  await run("ffmpeg", args);
  return frames;
}

async function readCpuUsageUsec() {
  try {
    const raw = await readFile("/sys/fs/cgroup/cpu.stat", "utf8");
    const line = raw.split("\n").find((row) => row.startsWith("usage_usec "));
    const value = Number(line?.split(/\s+/)[1]);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

async function readCgroupNumber(path) {
  try {
    const raw = await readFile(path, "utf8");
    const value = Number(String(raw).trim().split(/\s+/)[0]);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

async function compose(request) {
  const started = Date.now();
  const urls = Array.isArray(request.urls) ? request.urls.filter((url) => typeof url === "string") : [];
  if (urls.length < 1) throw new Error("missing clips");
  const mode = request.background === "neutral" ? "neutral" : "blur";
  const dir = await mkdtemp(join(tmpdir(), "story-compose-"));
  const timing = { downloadMs: 0, ffmpegMs: 0, uploadMs: 0, outputBytes: 0 };
  try {
    const normalized = [];
    const downloadStarted = Date.now();
    for (let index = 0; index < urls.length; index += 1) {
      const source = join(dir, `source-${index}`);
      const next = join(dir, `norm-${index}.mp4`);
      await download(urls[index], source);
      const info = await probe(source);
      normalized.push({ source, next, info });
    }
    timing.downloadMs = Date.now() - downloadStarted;
    const ffmpegStarted = Date.now();
    const ready = [];
    for (const item of normalized) {
      const frames = await normalize(item.source, item.next, mode, item.info);
      ready.push({ file: item.next, frames });
    }
    const output = join(dir, "composed.mp4");
    if (ready.length === 1) {
      await writeFile(output, await readFile(ready[0].file));
    } else {
      const totalFrames = Math.min(
        MAX_STORY_FRAMES,
        ready.reduce((sum, item) => sum + item.frames, 0),
      );
      const seconds = secondsText(totalFrames);
      const args = ["-y"];
      for (const item of ready) args.push("-i", item.file);
      const pads = ready.map((_, index) => `[${index}:v][${index}:a]`).join("");
      args.push(
        "-filter_complex",
        `${pads}concat=n=${ready.length}:v=1:a=1[v][a]`,
        ...encodeArgs(seconds, output),
      );
      await run("ffmpeg", args);
    }
    timing.ffmpegMs = Date.now() - ffmpegStarted;
    const body = await readFile(output);
    timing.outputBytes = body.length;
    if (typeof request.uploadUrl === "string") {
      const uploadStarted = Date.now();
      const uploaded = await fetch(request.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4", "x-upsert": "true" },
        body,
      });
      timing.uploadMs = Date.now() - uploadStarted;
      if (!uploaded.ok) throw new Error(`upload ${uploaded.status}`);
    }
    const memoryPeakBytes = await readCgroupNumber("/sys/fs/cgroup/memory.peak");
    const cpuUsageUsec = await readCpuUsageUsec();
    return {
      ok: true,
      ...timing,
      totalMs: Date.now() - started,
      memoryPeakBytes,
      cpuUsageUsec,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function composeAndCallback(request) {
  const result = await compose(request);
  if (typeof request.callbackUrl === "string" && request.callbackUrl) {
      await fetch(request.callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-story-compose-signature": String(request.signature ?? ""),
        },
        body: JSON.stringify({
          mediaId: request.mediaId,
          manifestHash: request.manifestHash,
          ok: true,
        }),
      });
    }
  return result;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function listen(port) {
  let busy = false;
  const server = createServer(async (req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.method !== "POST" || req.url !== "/compose") {
      res.writeHead(404);
      res.end();
      return;
    }
    if (busy) {
      res.writeHead(409, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "busy" }));
      return;
    }
    busy = true;
    try {
      const raw = await readBody(req);
      const request = JSON.parse(raw);
      const result = await composeAndCallback(request);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : "compose failed";
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: message }));
    } finally {
      busy = false;
    }
  });
  server.listen(port, "0.0.0.0");
  const stop = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

async function main() {
  const raw = process.env.COUNTY_STORY_COMPOSE_REQUEST;
  if (raw) {
    await composeAndCallback(JSON.parse(raw));
    return;
  }
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1) throw new Error("missing port");
  listen(port);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "compose failed";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
