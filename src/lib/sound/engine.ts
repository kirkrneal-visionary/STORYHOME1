/**
 * Story Glass Web Audio engine — synthesized, unlock-on-gesture, sparse.
 */

import {
  SOUND_CUES,
  SOUND_MASTER_GAIN,
  SOUND_TEMP_SCALE,
  type SoundTemperature,
  type StorySoundCue,
  type TonePart,
} from "@/lib/sound/cues";

let sharedCtx: AudioContext | null = null;
let unlocked = false;
let lastCueAt = 0;
const MIN_GAP_MS = 90;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Call from first pointer/key — browsers require a gesture to start audio. */
export async function unlockStorySound(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
  unlocked = ctx.state === "running";
}

export function isStorySoundUnlocked(): boolean {
  return unlocked;
}

function schedulePart(
  ctx: AudioContext,
  part: TonePart,
  when: number,
  gainScale: number,
  pitchScale: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = part.type ?? "sine";
  osc.frequency.value = part.hz * pitchScale;

  filter.type = "lowpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.7;

  const peak = Math.max(0.0001, SOUND_MASTER_GAIN * part.gain * gainScale);
  const t0 = when + part.delay;
  const t1 = t0 + part.dur;

  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t1);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t0);
  osc.stop(t1 + 0.02);
}

export type PlayStorySoundOptions = {
  temperature?: SoundTemperature;
  /** Force play even if gap throttle would skip (previews). */
  force?: boolean;
};

/**
 * Play a Story Glass cue. No-ops when context missing or not unlocked.
 * Returns false if skipped.
 */
export function playStorySound(
  cue: StorySoundCue,
  opts: PlayStorySoundOptions = {},
): boolean {
  const ctx = getCtx();
  if (!ctx || ctx.state !== "running") return false;

  const nowMs = performance.now();
  if (!opts.force && nowMs - lastCueAt < MIN_GAP_MS) return false;
  lastCueAt = nowMs;

  const recipe = SOUND_CUES[cue];
  if (!recipe) return false;

  const temp = opts.temperature ?? "home";
  const scale = SOUND_TEMP_SCALE[temp] ?? SOUND_TEMP_SCALE.home;
  const when = ctx.currentTime + 0.001;

  for (const part of recipe.parts) {
    schedulePart(ctx, part, when, scale.gain, scale.pitch);
  }
  return true;
}

/** Soft preview of the sound suite (Settings). */
export function previewStorySoundSuite(temperature: SoundTemperature = "home") {
  const order: StorySoundCue[] = ["tap", "select", "enter", "study", "success"];
  let i = 0;
  const tick = () => {
    const cue = order[i++];
    if (!cue) return;
    playStorySound(cue, { temperature, force: true });
    if (i < order.length) window.setTimeout(tick, 320);
  };
  void unlockStorySound().then(tick);
}
