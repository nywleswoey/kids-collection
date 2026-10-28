/**
 * Local (no AI) animation generator for the Pokémon region themes'
 * official-artwork cards — the owner's one-shot command:
 *
 *   pnpm pokemon-anim
 *
 * For every card whose resolved provider is `pokeapi-official-artwork` (in
 * seed order, across all themes), with an already-APPROVED still already in
 * `seed-content/review/`: fetches that card's source artwork, synthesizes a
 * short seamless loop (float, breathe, sway, type-coloured sparkles —
 * `frames.ts`), and encodes it with `img2webp` into
 * `seed-content/supergrok-drop-anim/` under the exact filename the existing
 * animation pipeline expects (`animatedStem`). No `--auto-video`/Grok
 * involved — Grok's `image_to_video` is blocked by content moderation on this
 * art — and no `ffmpeg`, since there is no video clip to decode.
 *
 * Resumable: a card whose drop file already exists is skipped. A card with no
 * approved still yet is reported, not fabricated — same rule the Grok-video
 * lane applies to legendary cards. From here, the usual hand-off: `pnpm seed
 * --review --providers=pokeapi-official-artwork` imports what was generated,
 * `pnpm contact-sheet` shows it, and `pnpm seed --sync` publishes it on each
 * card's first insert — see docs/NEW-THEME-RUNBOOK.md.
 */
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { ANIMATED_DROP_DIR } from "@/shared/pool/animated-brief";
import { loadSeed } from "@/shared/pool/loader";
import { fetchOfficialArtwork } from "./artwork";
import { encodeLoopingWebp } from "./encode";
import { type GenerateFailure, generatePokemonAnim, isGenerateFailure } from "./generate";
import { planPokemonAnimEntries } from "./plan";

const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed-content", "review");
const DROP_DIR_ABS = join(process.cwd(), ANIMATED_DROP_DIR);

async function main(): Promise<number> {
  const seed = loadSeed(SEED_PATH);
  const entries = planPokemonAnimEntries(seed);

  if (entries.length === 0) {
    console.log(`No card uses the pokeapi-official-artwork provider. Nothing to do.`);
    return 0;
  }

  mkdirSync(DROP_DIR_ABS, { recursive: true });
  console.log(
    `${entries.length} Pokémon card(s) eligible for local animation.\n` + `Drop folder: ${DROP_DIR_ABS}\n`,
  );

  let generated = 0;
  let skipped = 0;
  const failures: GenerateFailure[] = [];

  for (const [i, entry] of entries.entries()) {
    if (existsSync(join(DROP_DIR_ABS, entry.fileName))) {
      console.log(`[${i + 1}/${entries.length}] ${entry.card} — already generated (${entry.fileName}), skipping.`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${entries.length}] ${entry.card} — generating…`);
    const result = await generatePokemonAnim(entry, {
      reviewDir: REVIEW_DIR,
      dropDir: DROP_DIR_ABS,
      fetchArtwork: fetchOfficialArtwork,
      encoder: encodeLoopingWebp,
    });
    if (isGenerateFailure(result)) {
      console.log(`  ⛔ ${entry.card} — ${result.reason}`);
      failures.push(result);
    } else {
      console.log(`  Saved → ${join(DROP_DIR_ABS, result.fileName)}`);
      generated++;
    }
  }

  console.log(
    `\n${generated} generated this run, ${skipped} already generated, ${failures.length} failed, ` +
      `${entries.length} card(s) total.`,
  );
  if (failures.length > 0) {
    console.log(`Failed cards:`);
    for (const f of failures) console.log(`  - ${f.card}: ${f.reason}`);
  }
  return failures.length > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
