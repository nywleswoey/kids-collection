/**
 * Sound settings persistence (PURE, SSR-safe).
 * Namespaced localStorage keys; no PII. Defaults: SFX on, BGM off (starts on first tap).
 */

export const SFX_KEY = "kc.snd.sfx";
export const BGM_KEY = "kc.snd.bgm";

function store(): Storage | null {
  try {
    // Present in the browser; undefined during SSR / node tests unless stubbed.
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

function read(key: string, fallback: boolean): boolean {
  const ls = store();
  if (!ls) return fallback;
  try {
    const v = ls.getItem(key);
    if (v === null) return fallback;
    return v === "1";
  } catch {
    return fallback;
  }
}

function write(key: string, value: boolean): void {
  const ls = store();
  if (!ls) return;
  try {
    ls.setItem(key, value ? "1" : "0");
  } catch {
    /* storage blocked (private mode / quota) — silent, non-fatal */
  }
}

export function getSfxEnabled(): boolean {
  return read(SFX_KEY, true);
}

export function getBgmEnabled(): boolean {
  return read(BGM_KEY, false);
}

export function setSfxEnabled(value: boolean): void {
  write(SFX_KEY, value);
}

export function setBgmEnabled(value: boolean): void {
  write(BGM_KEY, value);
}
