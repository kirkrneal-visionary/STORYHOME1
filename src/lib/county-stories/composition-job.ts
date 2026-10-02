/** One composition revision. A repeat of the same frozen clip list does not start a second output. */

export const COMPOSE_MAX_ATTEMPTS = 3;

export type ComposeStateName = "waiting" | "composing" | "ready" | "failed";
export type ComposeFailureKind = "retryable" | "stopped";

export type CompositionSnapshot = {
  revision: number;
  manifestHash: string | null;
  state: ComposeStateName | null;
  failure: ComposeFailureKind | null;
  attempt: number;
  leaseUntilMs: number | null;
  outputPath: string | null;
  providerAssetId: string | null;
};

export type CompositionEffect =
  | { kind: "ready"; outputPath: string }
  | { kind: "in-progress" }
  | { kind: "start"; outputPath: string; revision: number; attempt: number; supersededAssetId: string | null }
  | { kind: "rejected"; code: "STOPPED" };

export function blankComposition(): CompositionSnapshot {
  return {
    revision: 0,
    manifestHash: null,
    state: null,
    failure: null,
    attempt: 0,
    leaseUntilMs: null,
    outputPath: null,
    providerAssetId: null,
  };
}

function leaseOpen(snapshot: CompositionSnapshot, nowMs: number): boolean {
  return snapshot.state === "composing" && snapshot.leaseUntilMs != null && snapshot.leaseUntilMs > nowMs;
}

export function startComposition(opts: {
  snapshot: CompositionSnapshot;
  manifestHash: string;
  outputPathFor: (revision: number, manifestHash: string) => string;
  nowMs: number;
  leaseMs: number;
}): { snapshot: CompositionSnapshot; effect: CompositionEffect } {
  const current = opts.snapshot;
  const same = current.manifestHash === opts.manifestHash;

  if (same && current.state === "ready" && current.outputPath) {
    return { snapshot: current, effect: { kind: "ready", outputPath: current.outputPath } };
  }
  if (same && leaseOpen(current, opts.nowMs)) {
    return { snapshot: current, effect: { kind: "in-progress" } };
  }
  if (same && current.state === "failed" && current.failure === "stopped") {
    return { snapshot: current, effect: { kind: "rejected", code: "STOPPED" } };
  }

  const revise = !same && current.manifestHash != null;
  const revision = revise ? current.revision + 1 : Math.max(current.revision, 1);
  const nextAttempt = !revise && (current.state === "composing" || current.state === "failed") ? current.attempt + 1 : 1;
  if (nextAttempt > COMPOSE_MAX_ATTEMPTS) {
    return {
      snapshot: {
        ...current,
        state: "failed",
        failure: "stopped",
        leaseUntilMs: null,
      },
      effect: { kind: "rejected", code: "STOPPED" },
    };
  }

  const outputPath = opts.outputPathFor(revision, opts.manifestHash);
  const supersededAssetId = revise ? current.providerAssetId : null;
  const snapshot: CompositionSnapshot = {
    revision,
    manifestHash: opts.manifestHash,
    state: "composing",
    failure: null,
    attempt: nextAttempt,
    leaseUntilMs: opts.nowMs + opts.leaseMs,
    outputPath,
    providerAssetId: revise ? null : current.providerAssetId,
  };
  return {
    snapshot,
    effect: {
      kind: "start",
      outputPath,
      revision,
      attempt: nextAttempt,
      supersededAssetId,
    },
  };
}

export function finishComposition(opts: {
  snapshot: CompositionSnapshot;
  manifestHash: string;
  ok: boolean;
  failure?: ComposeFailureKind;
  nowMs: number;
}): { snapshot: CompositionSnapshot; applied: boolean } {
  if (opts.snapshot.manifestHash !== opts.manifestHash) {
    return { snapshot: opts.snapshot, applied: false };
  }
  if (opts.ok) {
    return {
      applied: true,
      snapshot: {
        ...opts.snapshot,
        state: "ready",
        failure: null,
        leaseUntilMs: null,
      },
    };
  }
  const failure = opts.failure ?? "retryable";
  const stopped = failure === "stopped" || opts.snapshot.attempt >= COMPOSE_MAX_ATTEMPTS;
  return {
    applied: true,
    snapshot: {
      ...opts.snapshot,
      state: "failed",
      failure: stopped ? "stopped" : "retryable",
      leaseUntilMs: null,
    },
  };
}

export function mayReleaseLocalClips(opts: {
  remoteStored: boolean;
  composed: boolean;
  validated: boolean;
  muxAccepted: boolean;
}): boolean {
  return opts.remoteStored && opts.composed && opts.validated && opts.muxAccepted;
}

/** When the phone is full, drop local copies that already exist remotely before unsaved clips. */
export function localEvictRank(clip: { remoteStored: boolean; muxAccepted: boolean }): number {
  if (clip.muxAccepted) return 0;
  if (clip.remoteStored) return 1;
  return 2;
}
