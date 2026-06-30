/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   npm run seed -- --review     generate images to seed/review/ (no DB/Blob writes)
 *   npm run seed -- --publish    generate -> upload to Blob -> insert cards (idempotent)
 *
 * Requires DATABASE_URL and (for --publish) BLOB_READ_WRITE_TOKEN in env.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/features/pool/loader";
import { buildPrompt } from "@/features/pool/prompt";
import { generateImage, uploadImage } from "@/features/pool/image";
import { upsertTheme, insertCardIfNew, cardExists } from "@/features/pool/writer";
import type { Rarity } from "@/lib/types";

const SEED_PATH = join(process.cwd(), "seed", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed", "review");
const CONCURRENCY = 3;

type Mode = "review" | "publish";

async function main() {
  const mode: Mode = process.argv.includes("--publish") ? "publish" : "review";
  const seed = loadSeed(SEED_PATH); // fail-fast validation
  if (mode === "review") mkdirSync(REVIEW_DIR, { recursive: true });

  const report = { inserted: 0, skipped: 0, failed: 0, reviewed: 0 };

  for (const theme of seed.themes) {
    const themeId = mode === "publish" ? await upsertTheme(theme.name) : "(review)";

    await runPool(theme.cards, CONCURRENCY, async (card) => {
      try {
        if (mode === "publish" && (await cardExists(themeId, card.name))) {
          report.skipped++;
          return;
        }
        const bytes = await generateImage(buildPrompt(card)); // retried internally
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
