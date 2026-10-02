/**
 * One Worker. One Durable Object per composition revision. One container execution.
 * Story Home remains the authority for state, lease, revision, and retry.
 * This process does not receive a database password, Supabase service key, or Mux secret.
 */
import { DurableObject } from "cloudflare:workers";

const DEFAULT_VCPU = 1;
const DEFAULT_MEMORY_MIB = 3072;
const DEFAULT_DISK_MB = 4096;
const COMPOSE_PORT = 8080;

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function bearer(request) {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : "";
}

function secretsMatch(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(container, port) {
  const deadline = Date.now() + 30_000;
  let lastError = "container did not listen";
  while (Date.now() < deadline) {
    try {
      const response = await container.getTcpPort(port).fetch("http://container/health");
      if (response.ok) return;
      lastError = `health ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "health failed";
    }
    await sleep(250);
  }
  throw new Error(lastError);
}

export class StoryComposeRevision extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const container = this.ctx.container;
    if (!container) return json({ ok: false, error: "container missing" }, 503);

    let body = {};
    if (request.method !== "GET") {
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "bad request" }, 400);
      }
    } else {
      body = {
        mediaId: url.searchParams.get("mediaId"),
        manifestHash: url.searchParams.get("manifestHash"),
        revision: url.searchParams.get("revision"),
      };
    }
    const mediaId = typeof body.mediaId === "string" ? body.mediaId : "";
    const manifestHash = typeof body.manifestHash === "string" ? body.manifestHash : "";
    const revision = positiveInt(body.revision, 0);
    if (!mediaId || !manifestHash || revision < 1) {
      return json({ ok: false, error: "bad request" }, 400);
    }

    const key = `${mediaId}:${revision}:${manifestHash}`;
    const executionId = `do:${key}`;
    const saved = await this.ctx.storage.get("result");
    if (request.method === "GET" && url.pathname === "/status") {
      return json({ ok: true, running: Boolean(container.running), result: saved ?? null }, 200);
    }
    if (request.method !== "POST" || url.pathname !== "/compose") {
      return json({ ok: false, error: "not found" }, 404);
    }
    if (saved && saved.key === key && saved.ok === true) {
      return json({ ok: true, executionId, recovered: true, ffmpegRan: false, result: saved }, 200);
    }
    if (container.running) {
      return json({ ok: true, executionId, inProgress: true }, 202);
    }

    const image = container.images?.base;
    if (!image) return json({ ok: false, error: "image missing" }, 503);

    const startedAt = Date.now();
    container.start({
      image,
      enableInternet: true,
      instance: {
        vcpu: positiveInt(body.vcpu, positiveInt(this.env.COUNTY_STORY_COMPOSE_VCPU, DEFAULT_VCPU)),
        memoryMib: positiveInt(body.memoryMib, positiveInt(this.env.COUNTY_STORY_COMPOSE_MEMORY_MIB, DEFAULT_MEMORY_MIB)),
        diskMb: positiveInt(body.diskMb, positiveInt(this.env.COUNTY_STORY_COMPOSE_DISK_MB, DEFAULT_DISK_MB)),
      },
    });
    const timeoutSec = positiveInt(body.timeoutSec, positiveInt(this.env.COUNTY_STORY_COMPOSE_TIMEOUT_SEC, 180));
    await container.setInactivityTimeout((timeoutSec + 30) * 1000);

    this.ctx.waitUntil(this.finish(container, body, key, executionId, startedAt));
    return json({ ok: true, executionId }, 202);
  }

  async finish(container, body, key, executionId, startedAt) {
    let payload = {};
    let healthyAt = null;
    try {
      await waitForHealth(container, COMPOSE_PORT);
      healthyAt = Date.now();
      const response = await container.getTcpPort(COMPOSE_PORT).fetch("http://container/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaId: body.mediaId,
          manifestHash: body.manifestHash,
          background: body.background,
          urls: body.urls,
          uploadUrl: body.uploadUrl,
          callbackUrl: body.callbackUrl,
          signature: body.signature,
        }),
      });
      payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        await this.ctx.storage.put("result", {
          key,
          ok: false,
          executionId,
          error: payload.error || "compose failed",
          startedAt,
          healthyAt,
          startupMs: healthyAt ? healthyAt - startedAt : null,
        });
        return;
      }
    } catch (error) {
      await this.ctx.storage.put("result", {
        key,
        ok: false,
        executionId,
        error: error instanceof Error ? error.message : "compose failed",
        startedAt,
        healthyAt,
        startupMs: healthyAt ? healthyAt - startedAt : null,
      });
      return;
    } finally {
      if (container.running) await container.destroy("composition finished");
    }
    const stoppedAt = Date.now();
    await this.ctx.storage.put("result", {
      key,
      ok: true,
      executionId,
      startedAt,
      healthyAt,
      startupMs: healthyAt ? healthyAt - startedAt : null,
      stoppedAt,
      shutdownMs: stoppedAt - (healthyAt ?? startedAt),
      downloadMs: payload.downloadMs ?? null,
      ffmpegMs: payload.ffmpegMs ?? null,
      uploadMs: payload.uploadMs ?? null,
      composeTotalMs: payload.totalMs ?? null,
      outputBytes: payload.outputBytes ?? null,
      memoryPeakBytes: payload.memoryPeakBytes ?? null,
      cpuUsageUsec: payload.cpuUsageUsec ?? null,
    });
  }
}

function revisionFrom(request, body) {
  const url = new URL(request.url);
  const mediaId = typeof body.mediaId === "string" ? body.mediaId : url.searchParams.get("mediaId") ?? "";
  const manifestHash = typeof body.manifestHash === "string" ? body.manifestHash : url.searchParams.get("manifestHash") ?? "";
  const revision = positiveInt(body.revision ?? url.searchParams.get("revision"), 0);
  return { mediaId, manifestHash, revision };
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST" && request.method !== "GET") return json({ ok: false, error: "method" }, 405);
    if (!secretsMatch(bearer(request), env.COUNTY_STORY_COMPOSE_WORKER_SECRET)) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    let body = {};
    if (request.method === "POST") {
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "bad request" }, 400);
      }
    }
    const { mediaId, manifestHash, revision } = revisionFrom(request, body);
    if (!mediaId || !manifestHash || revision < 1) {
      return json({ ok: false, error: "bad request" }, 400);
    }
    const name = `${mediaId}:${revision}:${manifestHash}`;
    const id = env.COMPOSE.idFromName(name);
    const path = request.method === "GET" ? `/status?mediaId=${encodeURIComponent(mediaId)}&revision=${revision}&manifestHash=${encodeURIComponent(manifestHash)}` : "/compose";
    return env.COMPOSE.get(id).fetch(`https://compose${path}`, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: request.method === "POST" ? JSON.stringify(body) : undefined,
    });
  },
};
