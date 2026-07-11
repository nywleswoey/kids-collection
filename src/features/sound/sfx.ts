/**
 * Sound-effect definitions (PURE → testable). No audio files:
 * each SFX is a synthesis recipe played by AudioEngine via Web Audio.
 */
import type { Rarity } from "@/lib/types";

export type SfxName =
  | "click"
  | "packOpen"
  | "flip"
  | "reveal"
  | "tokenChime"
  | "denied"
  | "slotFill"
  | "setComplete";

export type SfxWave = "sine" | "triangle" | "square" | "sawtooth" | "noise";

export interface SfxSpec {
  /** Oscillator/noise shape. */
  wave: SfxWave;
  /** Note(s) in Hz. Multiple → quick arpeggio/chord (chime, fanfare). */
  freqs: number[];
  /** Total duration in ms. */
  durationMs: number;
  /** Peak gain 0..1 before global/intensity scaling. */
  gain: number;
  /** Linear pitch glide to this Hz over the note (whoosh/denied). Optional. */
  sweepTo?: number;
}

/** Deterministic recipe per SFX. Pure → snapshot/asserted in tests. */
export function sfxSpec(name: SfxName): SfxSpec {
  switch (name) {
    case "click":
      return { wave: "triangle", freqs: [660], durationMs: 70, gain: 0.25 };
    case "packOpen":
      return { wave: "sawtooth", freqs: [180], durationMs: 420, gain: 0.3, sweepTo: 520 };
    case "flip":
      return { wave: "noise", freqs: [1200], durationMs: 180, gain: 0.28, sweepTo: 300 };
    case "reveal":
      return { wave: "sine", freqs: [523, 659, 784], durationMs: 460, gain: 0.32 };
    case "tokenChime":
      return { wave: "sine", freqs: [880, 1174], durationMs: 260, gain: 0.28 };
    case "denied":
      return { wave: "square", freqs: [200], durationMs: 200, gain: 0.22, sweepTo: 120 };
    case "slotFill":
      return { wave: "triangle", freqs: [740, 988], durationMs: 220, gain: 0.26 };
    case "setComplete":
      return { wave: "sine", freqs: [523, 659, 784, 1047], durationMs: 640, gain: 0.34 };
  }
}

const RARITY_INTENSITY: Record<Rarity, number> = {
  common: 0.3,
  rare: 0.55,
  epic: 0.8,
  legendary: 1,
};

/**
 * Reveal-sting loudness by rarity, bounded [0,1], monotonic by tier.
 * Legendary is the fullest sound; common the softest.
 */
export function revealIntensity(rarity: Rarity): number {
  return RARITY_INTENSITY[rarity];
}

/** Rarities that warrant a confetti burst on reveal. */
export function isBigReveal(rarity: Rarity): boolean {
  return rarity === "epic" || rarity === "legendary";
}
