"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { prefersReducedMotion } from "@/lib/motion";
import type { Rarity } from "@/lib/types";
import { play as enginePlay, unlock } from "./AudioEngine";
import { startBgm, stopBgm } from "./bgm";
import { revealIntensity, type SfxName } from "./sfx";
import {
  getBgmEnabled,
  getSfxEnabled,
  setBgmEnabled as persistBgm,
  setSfxEnabled as persistSfx,
} from "./settings";

export interface SoundContextValue {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  /** Play an SFX; pass rarity to scale the reveal sting. No-op if SFX off. */
  play: (name: SfxName, rarity?: Rarity) => void;
  toggleSfx: () => void;
  toggleBgm: () => void;
}

/** React context for sound state and controls. Provides SFX/BGM toggle state and play function. */
export const SoundContext = createContext<SoundContextValue | null>(null);

/**
 * Sound provider managing SFX and BGM state. Handles audio engine lifecycle,
 * user gesture unlocking, localStorage persistence, and provides sound controls
 * to descendants via context.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  // Start from defaults for a stable first render, then hydrate from storage.
  const [sfxEnabled, setSfx] = useState(true);
  const [bgmEnabled, setBgm] = useState(false);
  const unlockedRef = useRef(false);
  const bgmRef = useRef(false);
  bgmRef.current = bgmEnabled;

  useEffect(() => {
    setSfx(getSfxEnabled());
    setBgm(getBgmEnabled());
  }, []);

  // First user gesture unlocks audio and starts BGM if enabled (autoplay-safe).
  useEffect(() => {
    function onFirstGesture() {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      unlock();
      if (bgmRef.current) startBgm();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    }
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  const play = useCallback(
    (name: SfxName, rarity?: Rarity) => {
      if (!sfxEnabled) return;
      enginePlay(name, {
        intensity: rarity ? revealIntensity(rarity) : 1,
        attenuate: prefersReducedMotion(),
      });
    },
    [sfxEnabled],
  );

  const toggleSfx = useCallback(() => {
    setSfx((prev) => {
      const next = !prev;
      persistSfx(next);
      return next;
    });
  }, []);

  const toggleBgm = useCallback(() => {
    setBgm((prev) => {
      const next = !prev;
      persistBgm(next);
      if (next) {
        unlock();
        startBgm();
      } else {
        stopBgm();
      }
      return next;
    });
  }, []);

  return (
    <SoundContext.Provider value={{ sfxEnabled, bgmEnabled, play, toggleSfx, toggleBgm }}>
      {children}
    </SoundContext.Provider>
  );
}
