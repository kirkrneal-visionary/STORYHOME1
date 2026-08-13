"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { usePathname } from "next/navigation";
import {
  continuumProfile,
  temperatureForPath,
} from "@/lib/motion/continuum";
import {
  inferDirection,
  normalizePath,
  type NavDirection,
} from "@/lib/motion/routes";
import {
  MOTION_DISTANCE,
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_OPACITY,
  SWIPE_BACK,
  type ContinuumTemperature,
} from "@/lib/motion/tokens";

type Viewport = "mobile" | "tablet" | "desktop";

type MotionContextValue = {
  direction: NavDirection;
  reducedMotion: boolean;
  viewport: Viewport;
  distancePx: number;
  duration: typeof MOTION_DURATION;
  ease: typeof MOTION_EASE;
  opacity: typeof MOTION_OPACITY;
  swipe: typeof SWIPE_BACK;
  temperature: ContinuumTemperature;
  markBack: () => void;
  markForward: () => void;
  pathname: string;
  previousPathname: string;
};

const MotionContext = createContext<MotionContextValue | null>(null);

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribeViewport(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}

function getViewport(): Viewport {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const prevPathRef = useRef(pathname);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const pendingDirRef = useRef<NavDirection | null>(null);
  const [direction, setDirection] = useState<NavDirection>("none");

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const viewport = useSyncExternalStore(
    subscribeViewport,
    getViewport,
    () => "desktop" as const,
  );

  const markBack = useCallback(() => {
    pendingDirRef.current = "back";
  }, []);
  const markForward = useCallback(() => {
    pendingDirRef.current = "forward";
  }, []);

  useEffect(() => {
    const onPop = () => {
      pendingDirRef.current = "back";
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const from = normalizePath(prevPathRef.current);
    const to = normalizePath(pathname);
    if (from === to) return;
    const pending = pendingDirRef.current;
    pendingDirRef.current = null;
    const next =
      pending ??
      inferDirection(
        from,
        to,
        pending === "back" ? -1 : pending === "forward" ? 1 : null,
      );
    setDirection(next);
    setPreviousPathname(from);
    prevPathRef.current = pathname;
  }, [pathname]);

  const temperature = temperatureForPath(pathname);
  const profile = continuumProfile(temperature);

  const baseDistance =
    viewport === "mobile"
      ? MOTION_DISTANCE.mobile
      : viewport === "tablet"
        ? MOTION_DISTANCE.tablet
        : MOTION_DISTANCE.desktop;

  const distancePx = Math.round(baseDistance * profile.distanceScale);

  // Global Continuum cue for CSS (nav/chrome can key off temperature)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.continuumTemp = temperature;
    root.dataset.navDirection = direction;
    return () => {
      delete root.dataset.continuumTemp;
      delete root.dataset.navDirection;
    };
  }, [temperature, direction]);

  const value = useMemo<MotionContextValue>(
    () => ({
      direction,
      reducedMotion,
      viewport,
      distancePx,
      duration: MOTION_DURATION,
      ease: MOTION_EASE,
      opacity: MOTION_OPACITY,
      swipe: SWIPE_BACK,
      temperature,
      markBack,
      markForward,
      pathname,
      previousPathname,
    }),
    [
      direction,
      reducedMotion,
      viewport,
      distancePx,
      temperature,
      markBack,
      markForward,
      pathname,
      previousPathname,
    ],
  );

  return (
    <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
  );
}

export function useMotion() {
  const ctx = useContext(MotionContext);
  if (!ctx) {
    throw new Error("useMotion must be used within MotionProvider");
  }
  return ctx;
}

export function useMotionOptional() {
  return useContext(MotionContext);
}
