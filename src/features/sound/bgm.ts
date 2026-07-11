/**
 * Background-music loop manager (client-only). One HTMLAudioElement, looped,
 * `preload=none` so nothing loads until the child opts in. Autoplay-policy safe:
 * play() is only called after a user gesture, and rejections are swallowed.
 *
 * BGM_SRC is the single swap point — replace public/bgm/playful-loop.mp3 (or
 * point this at your own URL) to change the music.
 */

export const BGM_SRC = "/bgm/playful-loop.mp3";

let el: HTMLAudioElement | null = null;

function ensureEl(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (el) return el;
  try {
    el = new Audio(BGM_SRC);
    el.loop = true;
    el.preload = "none";
    el.volume = 0.35;
    return el;
  } catch {
    return null;
  }
}

/** Start (or resume) the loop. Safe to call repeatedly. */
export function startBgm(): void {
  const a = ensureEl();
  if (!a) return;
  a.play().catch(() => {
    /* autoplay blocked or file missing — stay silent, non-fatal */
  });
}

export function stopBgm(): void {
  if (!el) return;
  try {
    el.pause();
    el.currentTime = 0;
  } catch {
    /* ignore */
  }
}
