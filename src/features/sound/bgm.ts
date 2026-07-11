/**
 * Background-music controller (client-only).
 *
 * Default is a synthesized loop (MusicEngine) so music plays with no asset.
 * If a real file exists at BGM_SRC, it takes over and the synth stops — so you
 * can swap in licensed music by dropping public/bgm/playful-loop.mp3 (or point
 * BGM_SRC elsewhere). Autoplay-safe: only started after a user gesture.
 */
import { startMusic, stopMusic } from "./MusicEngine";

export const BGM_SRC = "/bgm/playful-loop.mp3";

let el: HTMLAudioElement | null = null;
let wantOn = false;

function tryFile(): void {
  if (typeof Audio === "undefined") return;
  try {
    const a = new Audio(BGM_SRC);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.35;
    a.addEventListener("canplaythrough", () => {
      if (!wantOn) return;
      stopMusic(); // real track wins over the synth
      a.play().catch(() => {
        /* blocked — fall back to synth */
        if (wantOn) startMusic();
      });
    });
    a.addEventListener("error", () => {
      /* no/invalid file — synth stays */
    });
    a.load();
    el = a;
  } catch {
    /* keep synth */
  }
}

/** Start music: synth immediately, upgrade to the file if one is available. */
export function startBgm(): void {
  wantOn = true;
  startMusic();
  if (!el) tryFile();
  else el.play().catch(() => startMusic());
}

export function stopBgm(): void {
  wantOn = false;
  stopMusic();
  if (el) {
    try {
      el.pause();
      el.currentTime = 0;
    } catch {
      /* ignore */
    }
  }
}
