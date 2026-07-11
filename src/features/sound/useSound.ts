"use client";

import { useContext } from "react";
import { SoundContext, type SoundContextValue } from "./SoundProvider";

const NOOP: SoundContextValue = {
  sfxEnabled: false,
  bgmEnabled: false,
  play: () => {},
  toggleSfx: () => {},
  toggleBgm: () => {},
};

/**
 * Access the sound API. Outside a SoundProvider (e.g. admin pages) it returns a
 * safe no-op so components stay reusable without crashing.
 */
export function useSound(): SoundContextValue {
  return useContext(SoundContext) ?? NOOP;
}
