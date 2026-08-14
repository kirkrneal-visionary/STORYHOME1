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
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMotionOptional } from "@/components/motion/MotionProvider";
import {
  SOUND_STORAGE_KEY,
  type SoundTemperature,
  type StorySoundCue,
} from "@/lib/sound/cues";
import {
  playStorySound,
  previewStorySoundSuite,
  unlockStorySound,
} from "@/lib/sound/engine";
import { isArchiePath } from "@/lib/navigation/networks";

type SoundContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  play: (cue: StorySoundCue, temperature?: SoundTemperature) => void;
  preview: () => void;
  reducedMotion: boolean;
};

const SoundContext = createContext<SoundContextValue | null>(null);

function readStoredEnabled(reducedMotion: boolean): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (raw === "on") return true;
    if (raw === "off") return false;
  } catch {
    /* ignore */
  }
  return !reducedMotion;
}

function subscribeReducedMotion(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => onChange();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

function getReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function SoundBridge({
  enabled,
  play,
}: {
  enabled: boolean;
  play: (cue: StorySoundCue, temperature?: SoundTemperature) => void;
}) {
  const motion = useMotionOptional();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const armedRef = useRef(false);
  const lastTravelKey = useRef("");
  const lastSectionRef = useRef<string | null>(null);
  const sectionPrimed = useRef(false);

  useEffect(() => {
    // Arm after first paint so hydration path pairs never chirp.
    const id = window.requestAnimationFrame(() => {
      armedRef.current = true;
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

  // Room travel — Continuum direction + temperature.
  useEffect(() => {
    if (!motion || !enabled || !armedRef.current) return;
    const from = motion.previousPathname;
    const to = motion.pathname;
    if (!from || from === to) return;

    const key = `${from}>${to}:${motion.direction}`;
    if (key === lastTravelKey.current) return;
    lastTravelKey.current = key;

    const temp = motion.temperature as SoundTemperature;
    if (motion.direction === "back") {
      play("back", temp);
      return;
    }
    if (isArchiePath(to) && !isArchiePath(from)) {
      play("study", temp);
      return;
    }
    if (temp === "still") return;
    play("enter", temp);
  }, [
    enabled,
    motion,
    motion?.direction,
    motion?.pathname,
    motion?.previousPathname,
    motion?.temperature,
    play,
  ]);

  // Archie module select (query-only).
  useEffect(() => {
    if (!enabled) return;
    if (!isArchiePath(pathname)) {
      sectionPrimed.current = false;
      lastSectionRef.current = null;
      return;
    }
    const section = searchParams.get("section");
    if (!sectionPrimed.current) {
      lastSectionRef.current = section;
      sectionPrimed.current = true;
      return;
    }
    if (lastSectionRef.current !== section) {
      lastSectionRef.current = section;
      play("select", "study");
    }
  }, [enabled, pathname, searchParams, play]);

  return null;
}

/**
 * Story Glass sound — sparse room / success feedback.
 * Mute lives in Settings · Experience. Unlock on first gesture.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const [enabled, setEnabledState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabledState(readStoredEnabled(reducedMotion));
    setHydrated(true);
  }, [reducedMotion]);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (next) void unlockStorySound();
  }, []);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    const unlock = () => {
      void unlockStorySound();
    };
    window.addEventListener("pointerdown", unlock, { once: true, passive: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [hydrated, enabled]);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-story-sound]",
      ) as HTMLElement | null;
      if (!el) return;
      const cue = (el.getAttribute("data-story-sound") || "tap") as StorySoundCue;
      void unlockStorySound().then(() => {
        playStorySound(cue, { force: true });
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hydrated, enabled]);

  const play = useCallback(
    (cue: StorySoundCue, temperature: SoundTemperature = "home") => {
      if (!enabled) return;
      void unlockStorySound().then(() => {
        playStorySound(cue, { temperature });
      });
    },
    [enabled],
  );

  const preview = useCallback(() => {
    setEnabled(true);
    previewStorySoundSuite("home");
  }, [setEnabled]);

  const value = useMemo(
    () => ({ enabled, setEnabled, play, preview, reducedMotion }),
    [enabled, setEnabled, play, preview, reducedMotion],
  );

  return (
    <SoundContext.Provider value={value}>
      {children}
      {hydrated ? (
        <SoundBridge enabled={enabled} play={play} />
      ) : null}
    </SoundContext.Provider>
  );
}

export function useStorySound() {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error("useStorySound must be used within SoundProvider");
  }
  return ctx;
}

export function useStorySoundOptional() {
  return useContext(SoundContext);
}
