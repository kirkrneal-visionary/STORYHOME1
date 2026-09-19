/**
 * P1A-3 username HTTP client.
 * Live mode uses P1A-2 routes only. Demo mode is local/in-memory for
 * Settings proof when Supabase Auth is not configured.
 */

import type {
  UsernameAvailabilityResponse,
  UsernameClaimResponse,
  UsernameOwnResponse,
} from "./username-api";
import { inspectUsername } from "./username";
import { ownCooldownCopy } from "./username-settings";

export type UsernameClient = {
  loadCurrent(): Promise<string | null>;
  checkAvailability(q: string): Promise<UsernameAvailabilityResponse>;
  claim(username: string): Promise<UsernameClaimResponse>;
};

export function liveUsernameClient(): UsernameClient {
  return {
    async loadCurrent() {
      const res = await fetch("/api/account/username", {
        headers: { accept: "application/json" },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as UsernameOwnResponse;
      return data.username ?? null;
    },
    async checkAvailability(q: string) {
      const res = await fetch(
        `/api/account/username/availability?q=${encodeURIComponent(q)}`,
        { headers: { accept: "application/json" } },
      );
      if (!res.ok) {
        throw new Error("availability_failed");
      }
      return (await res.json()) as UsernameAvailabilityResponse;
    },
    async claim(username: string) {
      const res = await fetch("/api/account/username/claim", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ username }),
      });
      try {
        return (await res.json()) as UsernameClaimResponse;
      } catch {
        return {
          ok: false,
          error: "Couldn't save that username. Try again.",
        };
      }
    },
  };
}

const DEMO_RESERVED = new Set([
  "admin",
  "settings",
  "marketplace",
  "stories",
  "consumer",
]);

type DemoRow = {
  username: string;
  claimedAt: number;
  changes: number;
  lastChangeAt: number | null;
};

const demoByUser = new Map<string, DemoRow>();
const demoTaken = new Set<string>();
const demoTombstones = new Set<string>();

export function resetDemoUsernames() {
  demoByUser.clear();
  demoTaken.clear();
  demoTombstones.clear();
}

export function demoUsernameClient(userId: string): UsernameClient {
  return {
    async loadCurrent() {
      return demoByUser.get(userId)?.username ?? null;
    },
    async checkAvailability(q: string) {
      const inspected = inspectUsername(q);
      if (inspected.status === "invalid") {
        return {
          status: "invalid" as const,
          normalized: inspected.normalized ?? undefined,
          code: inspected.code === "ok" ? "bad_chars" : inspected.code,
        };
      }
      const name = inspected.normalized!;
      if (
        DEMO_RESERVED.has(name) ||
        (demoTaken.has(name) && demoByUser.get(userId)?.username !== name) ||
        demoTombstones.has(name)
      ) {
        return { status: "unavailable", normalized: name };
      }
      return { status: "available", normalized: name };
    },
    async claim(username: string) {
      if (username === "takenow") {
        return { ok: false, error: "Username unavailable.", code: "unavailable" };
      }
      if (username === "coolwait") {
        const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        return {
          ok: false,
          error: ownCooldownCopy(until),
          code: "cooldown",
          retryAfter: until,
        };
      }
      if (username === "limitout") {
        return {
          ok: false,
          error: "You have reached the username-change limit.",
          code: "change_limit",
        };
      }
      const inspected = inspectUsername(username);
      if (inspected.status === "invalid") {
        return {
          ok: false,
          error: "Use letters, numbers, and underscores only.",
          code: inspected.code,
        };
      }
      const name = inspected.normalized!;
      if (
        DEMO_RESERVED.has(name) ||
        demoTombstones.has(name) ||
        (demoTaken.has(name) && demoByUser.get(userId)?.username !== name)
      ) {
        return { ok: false, error: "Username unavailable.", code: "unavailable" };
      }
      const existing = demoByUser.get(userId);
      if (existing?.username === name) {
        return { ok: true, normalized: name };
      }
      if (existing) {
        demoTaken.delete(existing.username);
        demoTombstones.add(existing.username);
        existing.changes += 1;
        existing.lastChangeAt = Date.now();
        existing.username = name;
      } else {
        demoByUser.set(userId, {
          username: name,
          claimedAt: Date.now(),
          changes: 0,
          lastChangeAt: null,
        });
      }
      demoTaken.add(name);
      return { ok: true, normalized: name };
    },
  };
}
