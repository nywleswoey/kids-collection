"use client";

import { useSound } from "./useSound";

/** Corner toggle widget: independent SFX and BGM switches (a11y: aria-pressed + text). */
export function SoundControls() {
  const { sfxEnabled, bgmEnabled, toggleSfx, toggleBgm, play } = useSound();

  return (
    <div
      className="fixed bottom-3 right-3 z-50 flex gap-2"
      data-testid="sound-controls"
      aria-label="Sound settings"
    >
      <button
        type="button"
        data-testid="toggle-sfx"
        aria-pressed={sfxEnabled}
        onClick={() => {
          if (!sfxEnabled) play("click"); // give feedback when turning on
          toggleSfx();
        }}
        className="btn btn--ghost px-3 py-2 text-sm"
        title={sfxEnabled ? "Sound effects on" : "Sound effects off"}
      >
        {sfxEnabled ? "🔊" : "🔇"} <span className="sr-only">Sound effects</span>
        <span aria-hidden className="ml-1 hidden sm:inline">
          SFX
        </span>
      </button>
      <button
        type="button"
        data-testid="toggle-bgm"
        aria-pressed={bgmEnabled}
        onClick={toggleBgm}
        className="btn btn--ghost px-3 py-2 text-sm"
        title={bgmEnabled ? "Music on" : "Music off"}
      >
        {bgmEnabled ? "🎵" : "🎶"} <span className="sr-only">Background music</span>
        <span aria-hidden className="ml-1 hidden sm:inline">
          {bgmEnabled ? "Music" : "Music off"}
        </span>
      </button>
    </div>
  );
}
