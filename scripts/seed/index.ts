/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   pnpm seed --review     generate images to seed/review/ (no DB/Blob writes)
 *   pnpm seed --publish    generate -> upload to Blob -> insert cards (idempotent)
 *
 * Requires DATABASE_URL and (for --publish) BLOB_READ_WRITE_TOKEN in env.
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
} from "@/features/pool/writer";
import type { Rarity } from "@/lib/types";

const SEED_PATH = join(process.cwd(), "seed", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed", "review");

// Pollinations' anonymous tier rate-limits (HTTP 429) under parallel bursts.
// Keep a low concurrency and space request *starts* apart; all env-tunable so a
// keyed/higher tier can crank them up. Defaults recover cleanly from 429.
const CONCURRENCY = intEnv("SEED_CONCURRENCY", 2);
const THROTTLE_MS = intEnv("SEED_THROTTLE_MS", 3000);
const RETRIES = intEnv("SEED_RETRIES", 5);

type Mode = "review" | "publish";

async function main() {
  const mode: Mode = process.argv.includes("--publish") ? "publish" : "review";
  const seed = loadSeed(SEED_PATH); // fail-fast validation
  if (mode === "review") mkdirSync(REVIEW_DIR, { recursive: true });

  // --reset wipes the existing pool first (Superheroes→Dinosaurs swap, U4-FR4).
  if (mode === "publish" && process.argv.includes("--reset")) {
    console.log("--reset: wiping existing pool (collections, cards, themes)…");
    await resetPool();
  }

  const report = { inserted: 0, skipped: 0, failed: 0, reviewed: 0 };

  for (const theme of seed.themes) {
    const themeId = mode === "publish" ? await upsertTheme(theme.name) : "(review)";

    await runPool(theme.cards, CONCURRENCY, async (card) => {
      try {
        if (mode === "publish" && (await cardExists(themeId, card.name))) {
          report.skipped++;
          return;
        }
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
        res === "inserted" ? report.inserted++ : report.skipped++;
      } catch (err) {
        report.failed++;
        console.error(`✗ ${theme.name} / ${card.name}: ${String(err)}`);
      }
    });
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
