/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   pnpm seed --review            generate images to seed/review/ (no DB/Blob writes)
 *   pnpm seed --publish           generate -> upload to Blob -> insert NEW cards (idempotent)
 *   pnpm seed --publish --reset   wipe the whole pool first, then republish everything
 *   pnpm seed --sync              DELTA: image-generate only NEW cards, update text
 *                                 (eduText/sourceUrl) on existing ones, and prune
 *                                 themes/cards dropped from the seed. No image regen
 *                                 for unchanged cards.
 *   pnpm seed --sync --allow-prune
 *                                 as above, permitting the prune. Without this flag a
 *                                 sync with pending prunes aborts before ANY write.
 *
 * Requires DATABASE_URL and (for --publish/--sync) BLOB_READ_WRITE_TOKEN in env.
 *
 * ── Destructive-operation guards (Inc23) ─────────────────────────────────────
 * `cards.theme_id` and `collections.card_id` both cascade, so deleting pool rows
 * destroys the children's collections. Any operation that deletes prints its blast
 * radius and, against production, requires the exact collection-row count typed in
 * at an interactive terminal. There is no bypass flag: the guard's only input
 * channel is a TTY, because the scenario being defended against is a stale value in
 * `.env.local` — the same file that supplies the production credential.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/features/pool/loader";
import { buildPrompt } from "@/features/pool/prompt";
import { generateImage, uploadImage } from "@/features/pool/image";
import {
  upsertTheme,
  insertCardIfNew,
  cardExists,
  resetPool,
  updateCardMeta,
  deleteThemesNotIn,
  deleteCardsNotIn,
} from "@/features/pool/writer";
import { previewReset, previewPrune, isEmpty } from "@/features/pool/blast-radius";
import { isProductionDatabaseUrl, describeTarget } from "@/features/pool/db-target";
import { confirmDestructive } from "./guard";
import type { Rarity } from "@/lib/types";

const SEED_PATH = join(process.cwd(), "seed", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed", "review");

// Pollinations' anonymous tier rate-limits (HTTP 429) under parallel bursts.
// Keep a low concurrency and space request *starts* apart; all env-tunable so a
// keyed/higher tier can crank them up. Defaults recover cleanly from 429.
const CONCURRENCY = intEnv("SEED_CONCURRENCY", 2);
const THROTTLE_MS = intEnv("SEED_THROTTLE_MS", 3000);
const RETRIES = intEnv("SEED_RETRIES", 5);

type Mode = "review" | "publish" | "sync";

async function main() {
  const mode: Mode = process.argv.includes("--sync")
    ? "sync"
    : process.argv.includes("--publish")
      ? "publish"
      : "review";
  const seed = loadSeed(SEED_PATH); // fail-fast validation
  if (mode === "review") mkdirSync(REVIEW_DIR, { recursive: true });

  const totalCards = seed.themes.reduce((n, t) => n + t.cards.length, 0);
  console.log(
    `Seed starting — mode=${mode}, ${seed.themes.length} themes, ${totalCards} cards.`,
  );

  // Clear, early guardrails (better than a deep getter throw at import time).
  if (mode !== "review") {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Run with your env loaded, e.g. `tsx --env-file=.env.local scripts/seed/index.ts` (or `pnpm seed --sync`).",
      );
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn(
        "⚠️  BLOB_READ_WRITE_TOKEN not set — image uploads for new cards will fail.",
      );
    }
  }

  // Destructive-operation guards (Inc23 FR3–FR8). Both run BEFORE any write:
  // every pool delete cascades into `collections`, so the decision to proceed
  // has to be made while nothing has happened yet.
  const isProduction = isProductionDatabaseUrl(process.env.DATABASE_URL);
  const target = describeTarget(process.env.DATABASE_URL);

  // --reset wipes the existing pool first (full rebuild, U4-FR4). resetPool()
  // itself refuses when the pool is owned; this is the operator-facing half.
  if (mode === "publish" && process.argv.includes("--reset")) {
    const radius = await previewReset();
    await confirmDestructive({ operation: "reset", target, isProduction, radius });
    console.log("--reset: wiping existing pool (cards, themes)…");
    await resetPool();
  }

  // Sync prunes anything missing from the seed file, and those deletes cascade
  // into the children's cards. Decide up front: with prunes pending and no
  // --allow-prune, abort before a single row is inserted, updated or deleted.
  if (mode === "sync") {
    const radius = await previewPrune(seed);
    if (!isEmpty(radius)) {
      if (!process.argv.includes("--allow-prune")) {
        console.error(
          `\n⛔ --sync would prune ${radius.themes} theme(s) and ${radius.cards} card(s), ` +
            `destroying ${radius.collectionRows} collection row(s).\n` +
            `   Nothing has been written. Re-run with --allow-prune if that is intended.\n`,
        );
        console.error(`   Themes: ${radius.themeNames.join(", ") || "(none)"}`);
        for (const c of radius.perChild) {
          console.error(`   ${c.name}: ${c.rows} card row(s)`);
        }
        process.exitCode = 1;
        return;
      }
      await confirmDestructive({ operation: "prune", target, isProduction, radius });
    }
  }

  const report = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    reviewed: 0,
    prunedThemes: 0,
    prunedCards: 0,
  };

  // Array position is the theme's display order — appending a theme to
  // seed/cards.json makes it the most recent (Inc21 FR2).
  for (const [sortOrder, theme] of seed.themes.entries()) {
    const themeId =
      mode === "review" ? "(review)" : await upsertTheme(theme.name, sortOrder);

    await runPool(theme.cards, CONCURRENCY, async (card) => {
      try {
        const exists =
          mode !== "review" && (await cardExists(themeId, card.name));

        // Sync: existing card → update text only (no image regeneration).
        if (mode === "sync" && exists) {
          await updateCardMeta({
            themeId,
            name: card.name,
            eduText: card.eduText,
            sourceUrl: card.sourceUrl,
          });
          report.updated++;
          console.log(`✎ updated ${theme.name} / ${card.name} (text only)`);
          return;
        }

        // Publish (non-reset): existing card is left untouched.
        if (mode === "publish" && exists) {
          report.skipped++;
          return;
        }

        console.log(`🖼️  generating image: ${theme.name} / ${card.name}…`);
        await throttle(); // space request starts to stay under the rate limit
        const bytes = await generateImage(buildPrompt(card), { retries: RETRIES }); // retried internally
        const key = slug(`${theme.name}-${card.name}`);

        if (mode === "review") {
          writeFileSync(join(REVIEW_DIR, `${key}.jpg`), bytes);
          report.reviewed++;
          return;
        }

        const imageUrl = await uploadImage(key, bytes);
        const res = await insertCardIfNew({
          themeId,
          name: card.name,
          rarity: card.rarity as Rarity,
          imageUrl,
          eduText: card.eduText,
          sourceUrl: card.sourceUrl,
        });
        if (res === "inserted") {
          report.inserted++;
          console.log(`✓ inserted ${theme.name} / ${card.name}`);
        } else {
          report.skipped++;
        }
      } catch (err) {
        report.failed++;
        console.error(`✗ ${theme.name} / ${card.name}: ${String(err)}`);
      }
    });

    // Sync: prune cards removed from this theme in the seed.
    if (mode === "sync") {
      const n = await deleteCardsNotIn(
        themeId,
        theme.cards.map((c) => c.name),
      );
      report.prunedCards += n;
      if (n > 0) console.log(`🗑️  pruned ${n} card(s) from ${theme.name}`);
    }
  }

  // Sync: prune whole themes dropped from the seed (e.g. Superheroes).
  if (mode === "sync") {
    report.prunedThemes = await deleteThemesNotIn(seed.themes.map((t) => t.name));
    if (report.prunedThemes > 0) {
      console.log(`🗑️  pruned ${report.prunedThemes} dropped theme(s)`);
    }
  }

  console.log(`\nSeed (${mode}) complete:`, report);
  if (mode === "review") console.log(`Review images in: ${REVIEW_DIR}`);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** Read a non-negative integer from env, falling back to `def` if unset/invalid. */
function intEnv(name: string, def: number): number {
  const raw = process.env[name];
  if (raw === undefined) return def;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : def;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Global gate: hands out request "slots" at least THROTTLE_MS apart, so all
// pool workers across all themes collectively stay under the rate limit.
let nextSlot = 0;
async function throttle(): Promise<void> {
  if (THROTTLE_MS <= 0) return;
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + THROTTLE_MS;
  if (wait > 0) await sleep(wait);
}

/** Run tasks with a small concurrency cap (U3-PERF). */
async function runPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()!;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
