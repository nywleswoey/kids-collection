/**
 * Synthesized background music (client-only). A gentle, looping, kid-friendly
 * pad + pentatonic arpeggio built entirely from Web Audio — no audio file
 * required. Used as the default BGM and as the fallback when no mp3 is present.
 *
 * Look-ahead scheduler: every tick we queue the notes for the next slice of
 * time, so playback stays smooth without a media file.
 */
import { acquireContext } from "./AudioEngine";

// C-major pentatonic (warm, no "wrong" notes) across two octaves.
const ARP = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
// Slow chord roots for a soft pad underneath.
const PAD = [130.81, 174.61, 196.0, 174.61]; // C3 F3 G3 F3
const STEP = 0.28; // seconds per arp note
const PAD_BARS = 8; // arp notes per pad chord

let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let running = false;

function noteAt(ctx: AudioContext, freq: number, at: number, dur: number, gain: number, wave: OscillatorType) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  g.connect(master!);
  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, at);
  osc.connect(g);
  osc.start(at);
  osc.stop(at + dur);
}

function schedule() {
  const ctx = acquireContext();
  if (!ctx || !master || ctx.state !== "running") return;
  // Queue ~0.5s ahead.
  while (nextTime < ctx.currentTime + 0.5) {
    const arpFreq = ARP[step % ARP.length];
    noteAt(ctx, arpFreq, nextTime, STEP * 0.9, 0.09, "triangle");

    // New pad chord at the start of each bar.
    if (step % PAD_BARS === 0) {
      const root = PAD[(step / PAD_BARS) % PAD.length];
      const dur = STEP * PAD_BARS;
      noteAt(ctx, root, nextTime, dur, 0.05, "sine");
      noteAt(ctx, root * 1.5, nextTime, dur, 0.035, "sine"); // fifth
    }

    nextTime += STEP;
    step += 1;
  }
}

/** Start (or resume) the synthesized loop. Safe to call repeatedly. */
export function startMusic(): void {
  if (running) return;
  const ctx = acquireContext();
  if (!ctx) return;
  running = true;
  if (!master) {
    master = ctx.createGain();
    master.gain.value = 0.5; // overall BGM level (sits under SFX)
    master.connect(ctx.destination);
  }
  nextTime = ctx.currentTime + 0.1;
  schedule();
  timer = setInterval(schedule, 120);
}

export function stopMusic(): void {
  running = false;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (master) {
    try {
      master.gain.value = 0;
    } catch {
      /* ignore */
    }
    master = null;
  }
}
