/**
 * Sound settings persistence (PURE, SSR-safe).
 * Namespaced localStorage keys; no PII. Defaults: SFX on, BGM off (starts on first tap).
 */

import { storageGet, storageSet } from "@/lib/storage";

export const SFX_KEY = "kc.snd.sfx";
export const BGM_KEY = "kc.snd.bgm";

function read(key: string, fallback: boolean): boolean {
  const v = storageGet("localStorage", key);
  if (v === null) return fallback;
  return v === "1";
}

function write(key: string, value: boolean): void {
  storageSet("localStorage", key, value ? "1" : "0");
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
