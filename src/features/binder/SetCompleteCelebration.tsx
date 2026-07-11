"use client";

import { useContext, useEffect, useState } from "react";
import { SoundContext } from "@/features/sound/SoundProvider";
import { useSound } from "@/features/sound/useSound";
import { Confetti } from "@/features/anim/Confetti";

/**
 * Fires a fanfare + confetti once per session when a theme set is complete,
 * so revisiting the binder doesn't re-celebrate every load.
 */
export function SetCompleteCelebration({ themeId }: { themeId: string }) {
  const inPlayArea = useContext(SoundContext) !== null;
  const { play } = useSound();
  const [fire, setFire] = useState(0);

  useEffect(() => {
    if (!inPlayArea) return; // outside the play area (e.g. admin) → no celebration
    const key = `kc.snd.celebrated.${themeId}`;
    let already = false;
    try {
      already = sessionStorage.getItem(key) === "1";
    } catch {
      /* storage blocked — celebrate anyway */
    }
    if (already) return;
    try {
      sessionStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
    play("setComplete");
    setFire((n) => n + 1);
  }, [themeId, play, inPlayArea]);

  return <Confetti fire={fire} count={50} />;
}
