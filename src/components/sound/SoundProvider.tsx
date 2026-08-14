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
  unlockStorySound,
} from "@/lib/sound/engine";
import { isArchiePath } from "@/lib/navigation/networks";

type SoundContextValue = {
  /** Always true unless prefers-reduced-motion. Sound is the experience — no mute toggle. */
  enabled: boolean;
  play: (cue: StorySoundCue, temperature?: SoundTemperature) => void;
  reducedMotion: boolean;
};

const SoundContext = createContext<SoundContextValue | null>(null);

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
    const id = window.requestAnimationFrame(() => {
      armedRef.current = true;
    });
    return () => window.cancelAnimationFrame(id);
  }, []);

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
 * Story Glass sound — always on as part of the experience.
 * Only silent under prefers-reduced-motion (accessibility). No mute toggle.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const enabled = !reducedMotion;
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // Retire the old Phase G mute preference — sound is permanent now.
    try {
      window.localStorage.removeItem(SOUND_STORAGE_KEY);
    } catch {
      /* ignore */
    }
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

  const value = useMemo(
    () => ({ enabled, play, reducedMotion }),
    [enabled, play, reducedMotion],
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
