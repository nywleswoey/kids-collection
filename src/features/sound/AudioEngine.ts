/**
 * Web Audio SFX engine (client-only). Synthesizes every sound from sfxSpec —
 * no audio files. Lazily unlocks the AudioContext on the first user gesture and
 * degrades to a silent no-op if Web Audio is unavailable or blocked (NFR4).
 */
import { sfxSpec, type SfxName } from "./sfx";

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let available = true;
let noiseBuffer: AudioBuffer | null = null;

function ensureCtx(): Ctx | null {
  if (!available) return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) {
      available = false;
      return null;
    }
    ctx = new Ctor();
    return ctx;
  } catch {
    available = false;
    return null;
  }
}

function getNoise(c: Ctx): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 0.4);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  // Deterministic pseudo-noise (avoids Math.random for reproducibility).
  let seed = 1;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    data[i] = (seed / 0x40000000 - 1) * 0.6;
  }
  noiseBuffer = buf;
  return buf;
}

/** Resume/create the context. Call from a user-gesture handler. */
export function unlock(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {
      /* ignore — stays silent until a later gesture */
    });
  }
}

export function isAvailable(): boolean {
  return available;
}

/** Shared AudioContext (creates/returns it) for the music engine. Null if blocked. */
export function acquireContext(): AudioContext | null {
  return ensureCtx();
}

/**
 * Play a synthesized SFX. `intensity` (0..1) scales loudness; `attenuate`
 * softens output under reduced-motion. Never throws.
 */
export function play(
  name: SfxName,
  { intensity = 1, attenuate = false }: { intensity?: number; attenuate?: boolean } = {},
): void {
  const c = ensureCtx();
  if (!c || c.state !== "running") return;

  try {
    const spec = sfxSpec(name);
    const now = c.currentTime;
    const dur = spec.durationMs / 1000;
    const clampedI = Math.max(0, Math.min(1, intensity));
    const peak = spec.gain * (0.4 + 0.6 * clampedI) * (attenuate ? 0.4 : 1);
    const master = c.createGain();
    master.gain.value = 1;
    master.connect(c.destination);

    // Envelope helper for one voice.
    const voice = (freq: number, startAt: number, wave = spec.wave) => {
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, startAt);
      g.gain.exponentialRampToValueAtTime(peak, startAt + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
      g.connect(master);

      if (wave === "noise") {
        const src = c.createBufferSource();
        src.buffer = getNoise(c);
        const filter = c.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(freq, startAt);
        if (spec.sweepTo) filter.frequency.linearRampToValueAtTime(spec.sweepTo, startAt + dur);
        src.connect(filter);
        filter.connect(g);
        src.start(startAt);
        src.stop(startAt + dur);
      } else {
        const osc = c.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, startAt);
        if (spec.sweepTo) osc.frequency.linearRampToValueAtTime(spec.sweepTo, startAt + dur);
        osc.connect(g);
        osc.start(startAt);
        osc.stop(startAt + dur);
      }
    };

    // Multiple freqs → quick ascending arpeggio (chime/fanfare); single → one note.
    if (spec.freqs.length > 1) {
      const step = (dur * 0.5) / spec.freqs.length;
      spec.freqs.forEach((f, i) => voice(f, now + i * step));
    } else {
      voice(spec.freqs[0], now);
    }
  } catch {
    /* any Web Audio failure → silent, non-fatal */
  }
}
