/**
 * Deterministic roller travel. Desktop keeps the original 1-step wheel.
 * Mobile velocityPhysics uses these helpers only.
 */

export const WHEEL_PIXEL = 40;
export const FLICK_DEAD_PX_S = 220;
export const FLICK_MAX_STEPS = 8;

export function interpretWheel(
  acc: number,
  deltaY: number,
): { acc: number; steps: number } {
  const next = acc + deltaY;
  const dir = Math.sign(next);
  if (dir === 0) return { acc: next, steps: 0 };

  const fine = Math.abs(deltaY) <= 6;
  const threshold = fine ? 48 : WHEEL_PIXEL;
  if (Math.abs(next) < threshold) return { acc: next, steps: 0 };

  if (fine) return { acc: next - dir * threshold, steps: dir };

  const extra = Math.min(5, Math.floor((Math.abs(next) - threshold) / 56));
  return { acc: 0, steps: dir * (1 + extra) };
}

export function dragDeltaSteps(
  startY: number,
  currentY: number,
  rowH = 22,
): number {
  return Math.round((startY - currentY) / rowH);
}

/** Pointer moving down is positive velocity. Up-flick travels to later steps. */
export function flickTravel(velocityPxPerMs: number): number {
  const pxPerS = -velocityPxPerMs * 1000;
  const speed = Math.abs(pxPerS);
  if (speed < FLICK_DEAD_PX_S) return 0;
  const steps = Math.min(FLICK_MAX_STEPS, Math.max(1, Math.round(speed / 380)));
  return Math.sign(pxPerS) * steps;
}

export function sampleVelocity(
  samples: { t: number; y: number }[],
): number {
  if (samples.length < 2) return 0;
  const last = samples[samples.length - 1];
  let prev = samples[0];
  for (let i = samples.length - 2; i >= 0; i--) {
    if (last.t - samples[i].t >= 24) {
      prev = samples[i];
      break;
    }
    prev = samples[i];
  }
  const dt = last.t - prev.t;
  if (dt <= 0) return 0;
  return (last.y - prev.y) / dt;
}

export function coastDelays(travel: number): number[] {
  const n = Math.abs(travel);
  const delays: number[] = [];
  for (let i = 0; i < n; i++) delays.push(26 + i * 16);
  return delays;
}
