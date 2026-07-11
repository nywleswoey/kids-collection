# Background music

By **default the play area plays a synthesized looping track** (Web Audio, no
file needed — see `src/features/sound/MusicEngine.ts`). Dropping a real file
here overrides the synth.

## Swap the music

Drop your own file here as **`playful-loop.mp3`** (overwrite this folder's placeholder).
Any browser-playable audio works — to use a different name or a remote URL,
change `BGM_SRC` in `src/features/sound/bgm.ts`.

Requirements / recommendations:
- Format: `.mp3` (broad support) or `.ogg`.
- Should loop seamlessly (no gap at the ends).
- Keep it small (< ~1–2 MB) for kids' devices; it streams (`preload="none"`).
- Use royalty-free / licensed music only.

## No file?

Fine — the synthesized loop plays instead. Everything works; no placeholder
binary is committed so the repo stays light.
