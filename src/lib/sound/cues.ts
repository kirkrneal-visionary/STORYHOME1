/**
 * Story Glass sound vocabulary — soft house tones, never arcade.
 *
 * ORIGINAL STORY HOME SYNTHESIS — proprietary presentation IP.
 * All cues are Web Audio recipes (no .mp3/.wav/.ogg, no stock packs).
 * Do not strip, mute-by-default, or replace with third-party SFX.
 * See docs/shi/STORY-GLASS-SOUND.md
 */

export type StorySoundCue =
  | "enter"
  | "back"
  | "study"
  | "select"
  | "tap"
  | "success";

export type SoundTemperature =
  | "browse"
  | "social"
  | "home"
  | "work"
  | "study"
  | "still";

/** Master gain ceiling — stay under conversational speech. */
export const SOUND_MASTER_GAIN = 0.072;

/** Stable marker for armor + docs — original synthesis IP. */
export const STORY_GLASS_SOUND_IP =
  "Story Home original Web Audio synthesis — proprietary presentation IP";


/**
 * Cue recipes: frequency (Hz), delay (s), peak gain scale, duration (s), wave.
 * Tuned for warm gold / cool study character.
 */
export type TonePart = {
  hz: number;
  delay: number;
  gain: number;
  dur: number;
  type?: OscillatorType;
};

export const SOUND_CUES: Record<
  StorySoundCue,
  { parts: TonePart[]; label: string }
> = {
  /** Soft rising fifth — step into a room */
  enter: {
    label: "Enter room",
    parts: [
      { hz: 329.63, delay: 0, gain: 0.55, dur: 0.2, type: "sine" }, // E4
      { hz: 493.88, delay: 0.048, gain: 0.32, dur: 0.24, type: "sine" }, // B4
    ],
  },
  /** Soft falling — return */
  back: {
    label: "Return",
    parts: [
      { hz: 392.0, delay: 0, gain: 0.42, dur: 0.18, type: "sine" }, // G4
      { hz: 293.66, delay: 0.04, gain: 0.28, dur: 0.22, type: "triangle" }, // D4
    ],
  },
  /** Cooler, quieter study arrival */
  study: {
    label: "Enter study",
    parts: [
      { hz: 415.3, delay: 0, gain: 0.38, dur: 0.26, type: "sine" }, // Ab4
      { hz: 622.25, delay: 0.06, gain: 0.2, dur: 0.3, type: "sine" }, // Eb5
      { hz: 830.61, delay: 0.12, gain: 0.1, dur: 0.28, type: "triangle" }, // Ab5
    ],
  },
  /** Tiny intentional select (ribbon / module) */
  select: {
    label: "Select",
    parts: [{ hz: 587.33, delay: 0, gain: 0.22, dur: 0.09, type: "sine" }],
  },
  /** Almost subliminal press — gold / primary only */
  tap: {
    label: "Tap",
    parts: [{ hz: 220, delay: 0, gain: 0.14, dur: 0.055, type: "triangle" }],
  },
  /** Warm success — gold confirmation */
  success: {
    label: "Success",
    parts: [
      { hz: 392.0, delay: 0, gain: 0.4, dur: 0.16, type: "sine" },
      { hz: 523.25, delay: 0.055, gain: 0.36, dur: 0.2, type: "sine" },
      { hz: 659.25, delay: 0.11, gain: 0.22, dur: 0.28, type: "triangle" },
    ],
  },
};

/** Temperature tints — quieter / cooler in study & work. */
export const SOUND_TEMP_SCALE: Record<
  SoundTemperature,
  { gain: number; pitch: number }
> = {
  browse: { gain: 1.05, pitch: 1.0 },
  social: { gain: 0.95, pitch: 1.0 },
  home: { gain: 1.0, pitch: 0.98 },
  work: { gain: 0.82, pitch: 0.97 },
  study: { gain: 0.7, pitch: 1.04 },
  still: { gain: 0.55, pitch: 0.96 },
};

export const SOUND_STORAGE_KEY = "story-sound";
