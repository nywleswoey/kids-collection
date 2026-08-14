/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   pnpm seed --check-urls        check every sourceUrl in the seed file, then exit
 *   pnpm seed --review            generate images for NEW cards to seed/review/
 *   pnpm seed --publish           generate -> upload to Blob -> insert NEW cards (idempotent)
 *   pnpm seed --publish --reset   wipe the whole pool first, then republish everything
 *   pnpm seed --sync              DELTA: image-generate only NEW cards, update text
 *                                 (eduText/sourceUrl) on existing ones, and prune
 *                                 themes/cards dropped from the seed. No image regen
 *                                 for unchanged cards.
 *   pnpm seed --sync --allow-prune
 *                                 as above, permitting the prune. Without this flag a
 *                                 sync with pending prunes aborts before ANY write.
 *   pnpm seed --sync --allow-unreviewed
 *                                 as above, permitting inserts of cards with no
 *                                 reviewed image. Defeats the kid-safety guarantee.
 *
 * Requires DATABASE_URL (all modes) and, for --publish/--sync, BLOB_READ_WRITE_TOKEN.
 *
 * ── Destructive-operation guards (Inc23) ─────────────────────────────────────
 * `cards.theme_id` and `collections.card_id` both cascade, so deleting pool rows
 * destroys the children's collections. Any operation that deletes prints its blast
 * radius and, against production, requires the exact collection-row count typed in
 * at an interactive terminal. There is no bypass flag: the guard's only input
 * channel is a TTY, because the scenario being defended against is a stale value in
 * `.env.local` — the same file that supplies the production credential.
 *
 * ── Review→publish integrity (Inc24) ─────────────────────────────────────────
 * The parent could review one picture and the child receive another. Now review
 * filenames are content-addressed by prompt hash, `--sync` publishes the reviewed
 * BYTES, and it refuses to insert a card that has no reviewed image. `--review`
 * and that refusal compute their card set from the same plan, so they cannot
 * disagree.
 *
 * The reason once given here — "Pollinations is non-deterministic and the request
 * carries no seed" — is wrong, and was already corrected during Inc24 itself (see
 * `aidlc-docs/construction/build-and-test/increment24-vehicle-themes-build-and-test.md`
 * §3); this header just never caught up. Re-measured in #64: the request does omit
 * the seed, but the omitted seed takes a fixed server-side default, and generation
 * is reproducible — the same prompt at the same size returns a byte-identical JPEG
 * across independent, uncached generations.
 *
 * What is NOT stable is the model behind the prompt, and Inc24's hypothetical there
 * has since come true: Pollinations silently swapped its model (its docs still say
 * FLUX; responses report `sana`), so a prompt whose art shipped six weeks ago now
 * regenerates to different bytes. That is what keeps this machinery load-bearing —
 * it makes review→publish integrity independent of what the provider does to its
 * models. Any additional provider is held to the same rule: publish the reviewed
 * bytes, never regenerate at publish time, however deterministic it claims to be.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/features/pool/loader";
import { buildPrompt } from "@/features/pool/prompt";
import { generateImage, uploadImage } from "@/features/pool/image";
import { blobKey, reviewKey } from "@/features/pool/keys";
import { planInserts, cardKey, type PlannedInsert } from "@/features/pool/publish-plan";
import { comparePoolShape } from "@/features/pool/completeness";
import { listPublishedCardKeys, readPublishedShape } from "@/features/pool/pool-reads";
import { checkSourceUrls } from "@/features/pool/url-check";
import {
  upsertTheme,
  insertCardIfNew,
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

/** Absolute path of a card's reviewed image, if it were reviewed (Inc24 FR7). */
function reviewPath(themeName: string, card: { name: string; imagePrompt: string }): string {
  return join(REVIEW_DIR, `${reviewKey(themeName, card)}.jpg`);
}

async function main() {
  const mode: Mode = process.argv.includes("--sync")
    ? "sync"
    : process.argv.includes("--publish")
      ? "publish"
      : "review";
  const seed = loadSeed(SEED_PATH); // fail-fast validation (FR2–FR5)

  // ── --check-urls: standalone, network-only, DB-free. Runs and exits (FR11).
  // Deliberately not coupled to a publish: it is safe to run at any point during
  // authoring, and a publish should not fail for a reason unrelated to publishing.
  if (process.argv.includes("--check-urls")) {
    const total = seed.themes.reduce((n, t) => n + t.cards.length, 0);
    console.log(`Checking ${total} sourceUrl(s)…`);
    const failures = await checkSourceUrls(seed);
    if (failures.length === 0) {
      console.log(`✓ all ${total} sourceUrl(s) returned 200.`);
      return;
    }
    console.error(`\n⛔ ${failures.length} of ${total} sourceUrl(s) failed:\n`);
    for (const f of failures) {
      console.error(`   [${f.status}] ${f.theme} / ${f.card}\n        ${f.url}`);
    }
    process.exitCode = 1;
    return;
  }

  if (mode === "review") mkdirSync(REVIEW_DIR, { recursive: true });

  const totalCards = seed.themes.reduce((n, t) => n + t.cards.length, 0);
  console.log(
    `Seed starting — mode=${mode}, ${seed.themes.length} themes, ${totalCards} cards.`,
  );

  // Clear, early guardrails (better than a deep getter throw at import time).
  // DATABASE_URL is required in EVERY mode since Inc24: --review reads the pool to
  // scope itself to unpublished cards. Failing fast beats silently reverting to a
  // whole-pool review run, which is the 360-image behaviour FR10 exists to remove.
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Run with your env loaded, e.g. `tsx --env-file=.env.local scripts/seed/index.ts` (or `pnpm seed --sync`).",
    );
  }
  if (mode !== "review" && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "⚠️  BLOB_READ_WRITE_TOKEN not set — image uploads for new cards will fail.",
    );
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

  // Which cards would this run insert? Read AFTER any --reset, which empties the
  // pool: a plan computed before it would be stale and the FR9 guard below would
  // check the wrong set. (After a reset the plan is the entire pool, so a full
  // republish correctly demands a full re-review.)
  const published = await listPublishedCardKeys();
  const plan = planInserts(seed, published);
  const planned = new Set(plan.map((p) => cardKey(p.theme, p.card)));

  // ── FR9: refuse to publish an image no human has seen. Before any write, on
  // every insert path — --publish reaches insertCardIfNew too, and the invariant
  // ("no unreviewed content path to a child, ever") carries no mode qualifier.
  //
  // Insert-scoped: the already-published cards are not in `plan`, so they never
  // need a review file and no back-fill of seed/review/ is required.
  //
  // Same idiom as --allow-prune: named flag, printed blast radius, non-zero exit
  // by default, nothing written.
  if (mode !== "review") {
    const unreviewed = missingReviews(seed, planned);
    if (unreviewed.length > 0 && !process.argv.includes("--allow-unreviewed")) {
      console.error(
        `\n⛔ ${unreviewed.length} card(s) would be inserted with no reviewed image:\n`,
      );
      for (const p of unreviewed) console.error(`   ${p.theme} / ${p.card}`);
      console.error(
        `\n   Nothing has been written. Run \`pnpm seed --review\` first, and look at\n` +
          `   every image. \`--allow-unreviewed\` exists but defeats the guarantee that\n` +
          `   no unreviewed image reaches a child.\n`,
      );
      process.exitCode = 1;
      return;
    }
    if (unreviewed.length > 0) {
      console.warn(
        `⚠️  --allow-unreviewed: publishing ${unreviewed.length} card(s) no human has seen.`,
      );
    }
  }

  const report = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    reviewed: 0,
    reused: 0,
    prunedThemes: 0,
    prunedCards: 0,
  };

  // Array position is the theme's display order — appending a theme to
  // seed/cards.json makes it the most recent (Inc21 FR2).
  for (const [sortOrder, theme] of seed.themes.entries()) {
    // review mode must not write: no upsert, and the plan needed no theme id.
    const themeId =
      mode === "review" ? "(review)" : await upsertTheme(theme.name, sortOrder);

    await runPool(theme.cards, CONCURRENCY, async (card) => {
      try {
        const isNew = planned.has(cardKey(theme.name, card.name));
        const reviewFile = reviewPath(theme.name, card);

        // Already published.
        if (!isNew) {
          // Sync: update text only (no image regeneration).
          if (mode === "sync") {
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
          // Publish and review: leave it alone. Skipping in review mode is what
          // turns a 360-image run back into one sitting's worth (FR10).
          report.skipped++;
          return;
        }

        // ── New card.
        if (mode === "review") {
          // Already reviewed under this exact prompt — resume rather than restart
          // after a rate-limited run (FR10).
          if (existsSync(reviewFile)) {
            report.skipped++;
            return;
          }
          console.log(`🖼️  generating image: ${theme.name} / ${card.name}…`);
          await throttle();
          const bytes = await generateImage(buildPrompt(card), { retries: RETRIES });
          writeFileSync(reviewFile, bytes);
          report.reviewed++;
          return;
        }

        // Publish the REVIEWED bytes when they exist (FR8). Generating a fresh
        // image for a card that has a matching review file is a regression, not
        // an optimisation — it re-opens the gap where the parent reviewed image A
        // and the child received image B.
        let bytes: Uint8Array;
        if (existsSync(reviewFile)) {
          bytes = new Uint8Array(readFileSync(reviewFile));
          report.reused++;
        } else {
          // Only reachable via --allow-unreviewed.
          console.log(`🖼️  generating image: ${theme.name} / ${card.name}…`);
          await throttle();
          bytes = await generateImage(buildPrompt(card), { retries: RETRIES });
        }

        const imageUrl = await uploadImage(blobKey(theme.name, card.name), bytes);
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

  // ── FR12: did every theme actually land? In-band, so it cannot be forgotten.
  // The schema already proved the FILE is correct, so a shortfall here is a failed
  // insert (a card that 429'd out), never an authoring error — which is why the
  // remedy is always "re-run --sync", never prune and never reset.
  if (mode === "sync") {
    const shortfalls = comparePoolShape(seed, await readPublishedShape());
    if (shortfalls.length === 0) {
      console.log(`✓ completeness: all ${seed.themes.length} theme(s) published in full.`);
      return;
    }
    console.error(`\n⛔ completeness: ${shortfalls.length} (theme, rarity) short:\n`);
    for (const s of shortfalls) {
      console.error(`   ${s.theme} / ${s.rarity}: expected ${s.expected}, found ${s.found}`);
    }
    console.error(
      `\n   Re-run \`pnpm seed --sync\` — it is idempotent and inserts only what is\n` +
        `   missing. Never prune, never reset. No child has lost anything; the only\n` +
        `   consequence is that those set-completion rewards are unreachable until\n` +
        `   the theme is whole.\n`,
    );
    process.exitCode = 1;
  }
}

/** Planned inserts that have no reviewed image on disk (FR9). */
function missingReviews(
  seed: { themes: { name: string; cards: { name: string; imagePrompt: string }[] }[] },
  planned: Set<string>,
): PlannedInsert[] {
  const missing: PlannedInsert[] = [];
  for (const theme of seed.themes) {
    for (const card of theme.cards) {
      if (!planned.has(cardKey(theme.name, card.name))) continue;
      if (!existsSync(reviewPath(theme.name, card))) {
        missing.push({ theme: theme.name, card: card.name });
      }
    }
  }
  return missing;
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
// pool workers across all themes collectively stay under the rate limit. Called
// only on paths that actually generate, so a resumed run pays nothing per card
// it skips.
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
