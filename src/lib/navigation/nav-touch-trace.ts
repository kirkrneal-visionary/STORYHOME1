/**
 * Optional touch traces. Off unless localStorage story-nav-touch-trace=1.
 * Never log secrets, session keys, or account fields.
 */

type NavTracePhase = "input" | "handler" | "nav-start" | "path-ready";

function tracingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("story-nav-touch-trace") === "1";
  } catch {
    return false;
  }
}

export function navTouchTrace(
  phase: NavTracePhase,
  detail: { href?: string; committed?: boolean },
): void {
  if (!tracingEnabled()) return;
  const mark = `story-nav:${phase}`;
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(mark);
  }
  const href = detail.href ? detail.href.split("?")[0] : "";
  console.info("[nav-touch]", phase, href, detail.committed ?? "");
}
