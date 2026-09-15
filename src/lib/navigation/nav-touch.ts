/**
 * Shared navigation touch rules.
 * One deliberate tap → one navigation. Do not navigate on pointer-down.
 */

export const NAV_TOUCH_MIN_PX = 44;

/** Movement beyond this is a scroll/drag, not a tap. */
export const NAV_SCROLL_SLOP_PX = 10;

export type NavPoint = { x: number; y: number };

export type NavUiState = "idle" | "pressed" | "pending" | "active";

export function pointerTravelPx(from: NavPoint, to: NavPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.hypot(dx, dy);
}

/** True when the pointer stayed still enough to count as a tap. */
export function shouldCommitNavTap(from: NavPoint | null, to: NavPoint | null): boolean {
  if (!from || !to) return true;
  return pointerTravelPx(from, to) <= NAV_SCROLL_SLOP_PX;
}

export function normalizeNavPath(href: string): string {
  if (!href) return "/";
  try {
    const url = href.startsWith("http")
      ? new URL(href)
      : new URL(href, "https://storyhome.local");
    const path = url.pathname || "/";
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  } catch {
    const path = href.split("?")[0] || "/";
    return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
  }
}

export function navHrefKey(href: string): string {
  if (!href) return "/";
  try {
    const url = href.startsWith("http")
      ? new URL(href)
      : new URL(href, "https://storyhome.local");
    const path = normalizeNavPath(url.pathname);
    return `${path}${url.search}`;
  } catch {
    return href;
  }
}

export function hrefMatchesPath(href: string, pathname: string): boolean {
  return normalizeNavPath(href) === normalizeNavPath(pathname);
}

/**
 * Confirmed destination vs in-flight.
 * Active only when the URL already matches. Pending never impersonates active.
 */
export function navUiState(opts: {
  active: boolean;
  pending: boolean;
  pressed?: boolean;
}): NavUiState {
  if (opts.active) return "active";
  if (opts.pending) return "pending";
  if (opts.pressed) return "pressed";
  return "idle";
}

export function meetsNavTouchMin(widthPx: number, heightPx: number): boolean {
  return widthPx >= NAV_TOUCH_MIN_PX && heightPx >= NAV_TOUCH_MIN_PX;
}

export type NavIntent = {
  gen: number;
  href: string;
  key: string;
};

/** Last-tap-wins store. Older in-flight destinations must not look confirmed. */
export function createNavIntentStore() {
  let gen = 0;
  let current: NavIntent | null = null;
  const listeners = new Set<() => void>();

  function emit() {
    listeners.forEach((fn) => fn());
  }

  return {
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    get() {
      return current;
    },
    begin(href: string): NavIntent {
      gen += 1;
      current = { gen, href, key: navHrefKey(href) };
      emit();
      return current;
    },
    isCurrent(intent: NavIntent | null) {
      return Boolean(intent && current && intent.gen === current.gen);
    },
    isPendingHref(href: string) {
      return Boolean(current && current.key === navHrefKey(href));
    },
    settle() {
      if (!current) return;
      current = null;
      emit();
    },
    reset() {
      gen = 0;
      current = null;
    },
  };
}
