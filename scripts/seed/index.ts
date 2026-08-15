/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   pnpm seed --check-urls        check every sourceUrl in the seed file, then exit
 *   pnpm seed --review            generate images for NEW cards to seed/review/,
 *                                 from EVERY registered provider (the bake-off)
 *   pnpm seed --review --providers=pollinations
 *                                 narrow the bake-off to named provider(s)
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
 * `--review` additionally requires each provider's key; see `.env.example`.
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
 * A card's art must be the bytes a parent actually approved. Review filenames are
 * content-addressed by prompt hash, `--sync` publishes the reviewed BYTES, and it
 * refuses to insert a card that has no reviewed image. `--review` and that refusal
 * compute their card set from the same plan, so they cannot disagree.
 *
 * The reason once given here — "Pollinations is non-deterministic and the request
 * carries no seed" — is wrong, and was already corrected during Inc24 itself (see
 * `aidlc-docs/construction/build-and-test/increment24-vehicle-themes-build-and-test.md`
 * §3); this header just never caught up. Re-measured in #64: the request does omit
 * the seed, but the omitted seed takes a fixed server-side default, and generation
 * is reproducible for a given model — while one model is deployed behind the prompt,
 * the same prompt at the same size returns a byte-identical JPEG across independent,
 * uncached generations. That bound is the claim, not an unconditional guarantee:
 * reproducibility is a property of the currently deployed model rather than something
 * Pollinations offers, and across a model swap the same prompt returns different bytes.
 *
 * Two narrower cases survive that correction, and each justifies a different half of
 * the machinery. An EDITED `imagePrompt` is the first: under the old slug-only
 * naming the review filename did not depend on the prompt, so an edited prompt still
 * matched the old file and `--sync` republished an image reviewed against a prompt
 * that no longer existed. Inc24 hit this three times, and it is why review filenames
 * are content-addressed.
 *
 * The second is the model behind the prompt, which is not stable, and Inc24's
 * hypothetical there has since come true: Pollinations silently swapped its model
 * (its docs still say FLUX; responses report `sana`), so a prompt whose art shipped
 * six weeks ago now regenerates to different bytes. That is why publish uses the
 * reviewed bytes rather than re-requesting the prompt — it makes review→publish
 * integrity independent of what the provider does to its models. Any additional
 * provider is held to the same rule: publish the reviewed bytes, never regenerate at
 * publish time, however deterministic it claims to be.
 *
 * ── The bake-off (#63, #67) ──────────────────────────────────────────────────
 * `--review` no longer generates one image per card. It generates one per card PER
 * PROVIDER, in parallel lanes, so a human compares a subject x provider row and
 * records the winner in `seed/cards.json` — a theme-level `provider` default plus
 * sparse per-card overrides. `--sync` resolves `card.provider ?? theme.provider` and
 * publishes THAT provider's reviewed bytes.
 *
 * The integrity guarantee is unchanged in meaning and stronger in practice. Review
 * filenames now carry the provider and a hash of its request parameters, so
 * switching provider — or drifting a provider's `steps` or `seed` — makes `--sync`
 * look for a file that does not exist, and FR9 refuses the insert. An UNRESOLVED
 * provider matches no file either, so a theme whose bake-off was never judged
 * publishes nothing. Fail-safe by construction, not by a new check.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/features/pool/loader";
import { buildPrompt } from "@/features/pool/prompt";
import { uploadImage } from "@/features/pool/image";
import { blobKey } from "@/features/pool/keys";
import { runBakeOff, makeGate, withRetry, type BakeOffJob } from "@/features/pool/bake-off";
import {
  buildSidecar,
  missingReviews,
  parseSidecar,
  reviewFileName,
  reviewStem,
  resolveProviderId,
  sidecarFileName,
  unknownProviders,
  type NamedCard,
  type ReviewSidecar,
} from "@/features/pool/review-files";
import {
  emptyProvenance,
  parseProvenance,
  recordProvenance,
  serializeProvenance,
  toProvenance,
  type ProvenanceFile,
  type PublishedCard,
} from "@/features/pool/provenance";
import type { SeedCard, ThemeSeed } from "@/features/pool/seed-schema";
import {
  CARD_SIZE,
  PROVIDER_IDS,
  ProviderSelectionError,
  parseProvidersFlag,
  providerById,
  selectLanes,
  type ImageProvider,
} from "@/features/pool/providers";
import { planInserts, cardKey } from "@/features/pool/publish-plan";
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
/** Committed, generated, never hand-edited — see `features/pool/provenance.ts` (#75). */
const PROVENANCE_PATH = join(process.cwd(), "seed", "provenance.json");

// Retry budget per (card, provider) attempt, honoured by both generation paths —
// the lane runner and `--allow-unreviewed`. Concurrency and pacing are NOT here
// any more: they differ per provider by orders of magnitude — Pollinations is
// capped at one request per 15s where Cloudflare tolerates 720 a minute — so each
// adapter declares its own and the lane runner enforces it (#63, #67). The env
// knobs this replaces existed "so a keyed tier can crank them up", which is now
// what a committed adapter constant says out loud.
const RETRIES = intEnv("SEED_RETRIES", 5);

/**
 * Publish concurrency. Unrelated to generation pacing — this bounds Blob uploads
 * and database inserts, which have no provider and no rate limit worth modelling.
 * The old default of 2 was tuned around Pollinations' 429s and has no bearing here.
 */
const PUBLISH_CONCURRENCY = intEnv("SEED_CONCURRENCY", 4);

type Mode = "review" | "publish" | "sync";

/** Absolute path of one bake-off candidate. */
function reviewPath(themeName: string, card: NamedCard, provider: ImageProvider): string {
  return join(REVIEW_DIR, reviewFileName(themeName, card, provider));
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

  // Which lanes will this run generate through? Resolved BEFORE any destructive
  // guard or network call so a missing key costs nothing, and aborts rather than
  // quietly narrowing the bake-off — a lane silently absent from a comparison
  // looks like a provider that drew badly (#67).
  let lanes: readonly ImageProvider[] = [];
  if (mode === "review") {
    try {
      lanes = selectLanes(parseProvidersFlag(process.argv));
    } catch (err) {
      if (!(err instanceof ProviderSelectionError)) throw err;
      console.error(`\n⛔ ${err.message}\n`);
      process.exitCode = 1;
      return;
    }
    console.log(`Providers: ${lanes.map((p) => p.id).join(", ")}`);
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
  const themes: readonly ThemeSeed[] = seed.themes;

  // ── --review: the eager bake-off. Lane-major, so it does not share the
  // publish path's per-theme loop — nothing here writes to the database, and a
  // lane spans every theme in one queue so its pacing is spent on generating
  // rather than on waiting at theme boundaries.
  if (mode === "review") {
    await review(themes, planned, lanes);
    return;
  }

  // Read the provenance file BEFORE anything is published (#75). It is loaded
  // rather than merely appended to, so a corrupt one is a fail-fast with nothing
  // written — the alternative, treating an unreadable file as empty, would clobber
  // every record in it. Note this is the only way provenance can stop a run, and
  // it stops it before the run starts; once cards are being published it never
  // refuses one. That is FR9's job.
  const provenanceBefore = loadProvenance();

  // ── FR9: refuse to publish an image no human has seen. Before any write, on
  // every insert path — --publish reaches insertCardIfNew too, and the invariant
  // ("no unreviewed content path to a child, ever") carries no mode qualifier.
  //
  // Insert-scoped: the already-published cards are not in `plan`, so they never
  // need a review file and no back-fill of seed/review/ is required.
  //
  // Same idiom as --allow-prune: named flag, printed blast radius, non-zero exit
  // by default, nothing written.
  //
  // An unknown provider id is checked FIRST and is not overridable. It is an
  // authoring mistake — a typo, or an adapter that has since been retired — and
  // reporting it as "no reviewed image" would send the author to re-run a review
  // that could never satisfy the guard (#67).
  const unknown = unknownProviders(themes, planned, providerById);
  if (unknown.length > 0) {
    console.error(`\n⛔ ${unknown.length} card(s) name a provider that is not registered:\n`);
    for (const u of unknown) console.error(`   ${u.theme} / ${u.card} → "${u.providerId}"`);
    console.error(
      `\n   Registered: ${PROVIDER_IDS.join(", ")}\n` +
        `   Nothing has been written. Fix the \`provider\` value in seed/cards.json.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const unreviewed = missingReviews(themes, planned, providerById, (name) =>
    existsSync(join(REVIEW_DIR, name)),
  );
  if (unreviewed.length > 0 && !process.argv.includes("--allow-unreviewed")) {
    console.error(
      `\n⛔ ${unreviewed.length} card(s) would be inserted with no reviewed image:\n`,
    );
    for (const p of unreviewed) {
      console.error(`   ${p.theme} / ${p.card} — ${p.reason}`);
    }
    console.error(
      `\n   Nothing has been written. Run \`pnpm seed --review\` first, and look at\n` +
        `   every image. Cards marked "no provider chosen" need a \`provider\` on the\n` +
        `   card or its theme in seed/cards.json — that is the bake-off pick.\n` +
        `   \`--allow-unreviewed\` exists but defeats the guarantee that no unreviewed\n` +
        `   image reaches a child.\n`,
    );
    process.exitCode = 1;
    return;
  }
  if (unreviewed.length > 0) {
    console.warn(
      `⚠️  --allow-unreviewed: publishing ${unreviewed.length} card(s) no human has seen.`,
    );
  }

  // Every card whose bytes this run actually published, with what drew them.
  // Collected during the loop and written once at the end: a file rewritten 30
  // times mid-run would be a torn record if the run died halfway.
  const publishedCards: PublishedCard[] = [];

  const report = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    reused: 0,
    prunedThemes: 0,
    prunedCards: 0,
  };

  // Array position is the theme's display order — appending a theme to
  // seed/cards.json makes it the most recent (Inc21 FR2).
  for (const [sortOrder, theme] of themes.entries()) {
    const themeId = await upsertTheme(theme.name, sortOrder);

    await runPool(theme.cards, PUBLISH_CONCURRENCY, async (card) => {
      try {
        const isNew = planned.has(cardKey(theme.name, card.name));

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
          // Publish: leave it alone.
          report.skipped++;
          return;
        }

        // Publish the REVIEWED bytes when they exist (FR8). Generating a fresh
        // image for a card that has a matching review file is a regression, not
        // an optimisation — it re-opens the gap where the parent reviewed image A
        // and the child received image B.
        const provider = resolveProvider(theme, card);
        const reviewFile = provider ? reviewPath(theme.name, card, provider) : undefined;

        let bytes: Uint8Array;
        // What drew these bytes, for the durable record (#75). Undefined only
        // where nothing witnessed them — a candidate whose sidecar is gone —
        // and that is reported, never guessed at from today's adapter.
        let sidecar: ReviewSidecar | undefined;
        // Did a human see them? True off the review folder, false on the
        // --allow-unreviewed path below, and recorded either way.
        let reviewed = false;
        if (provider && reviewFile && existsSync(reviewFile)) {
          bytes = new Uint8Array(readFileSync(reviewFile));
          reviewed = true;
          sidecar = readSidecar(theme.name, card, provider);
          if (!sidecar) {
            console.warn(
              `⚠️  ${theme.name} / ${card.name}: no readable sidecar beside the reviewed image — ` +
                `publishing it, but nothing will record what drew it.`,
            );
          }
          report.reused++;
        } else {
          // Only reachable via --allow-unreviewed, which needs a live provider —
          // the one path in the CLI that generates at publish time, and the flag
          // already announces that it defeats the review guarantee.
          if (!provider) {
            throw new Error(
              `no provider resolved (set \`provider\` on the card or its theme; registered: ${PROVIDER_IDS.join(", ")})`,
            );
          }
          if (!provider.isConfigured()) {
            throw new Error(
              `provider ${provider.id} is not configured (set ${provider.requiredEnv.join(" and ")})`,
            );
          }
          console.log(`🖼️  generating image: ${theme.name} / ${card.name} [${provider.id}]…`);
          // Same bounded ladder the lane runner uses, so SEED_RETRIES means the
          // same thing on both generation paths. `generate()` is still one
          // logical attempt; the gate is re-entered per attempt so a retry pays
          // the provider's pacing rather than jumping it.
          const gate = publishGate(provider);
          const image = await withRetry(
            provider,
            () => gate().then(() => provider.generate(buildPrompt(card), CARD_SIZE)),
            { retries: RETRIES },
          );
          bytes = image.bytes;
          // Generated here, so the witness is in hand and needs no sidecar on
          // disk. `--allow-unreviewed` defeats the review guarantee; it does not
          // get to defeat the record as well.
          sidecar = buildSidecar(provider, image);
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
          // Recorded on `inserted` only: this is the run that put these bytes in
          // a child's binder (#75). A `skipped` card was published by some
          // earlier run, whose record — or absence of one — is the true one.
          if (provider && sidecar) {
            publishedCards.push({
              theme: theme.name,
              card: card.name,
              provenance: toProvenance(
                sidecar,
                reviewStem(theme.name, card, provider),
                reviewed,
              ),
            });
          }
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
    report.prunedThemes = await deleteThemesNotIn(themes.map((t) => t.name));
    if (report.prunedThemes > 0) {
      console.log(`🗑️  pruned ${report.prunedThemes} dropped theme(s)`);
    }
  }

  // ── #75: what drew each card this run published, made durable.
  //
  // After the inserts rather than alongside them: a file rewritten per card is a
  // torn record if the run dies halfway, and this one is a git artifact whose
  // whole value is being reviewable as a single diff.
  if (publishedCards.length > 0) {
    writeFileSync(
      PROVENANCE_PATH,
      serializeProvenance(recordProvenance(provenanceBefore, publishedCards)),
    );
    console.log(
      `✎ seed/provenance.json: recorded what drew ${publishedCards.length} newly published card(s). ` +
        `Commit it with the theme.`,
    );
  }

  console.log(`\nSeed (${mode}) complete:`, report);

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

/**
 * `--review`: generate every NEW card from every selected provider.
 *
 * The report is per lane rather than per run, because that is the number a human
 * needs at checkpoint 2: a lane showing 9/30 explains a contact sheet with gaps
 * in it, where a single aggregate "39 reviewed" would not.
 */
async function review(
  themes: readonly ThemeSeed[],
  planned: ReadonlySet<string>,
  lanes: readonly ImageProvider[],
): Promise<void> {
  const jobs: BakeOffJob<SeedCard>[] = [];
  let alreadyPublished = 0;
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (planned.has(cardKey(theme.name, card.name))) jobs.push({ theme: theme.name, card });
      else alreadyPublished++;
    }
  }

  console.log(
    `${jobs.length} new card(s) x ${lanes.length} provider(s) = ${jobs.length * lanes.length} image(s); ` +
      `${alreadyPublished} already-published card(s) skipped.`,
  );

  const outcomes = await runBakeOff(jobs, lanes, {
    size: CARD_SIZE,
    retries: RETRIES,
    buildPrompt: (card) => buildPrompt(card),
    isReviewed: (job, provider) => existsSync(reviewPath(job.theme, job.card, provider)),
    save: (job, provider, image) => {
      writeFileSync(reviewPath(job.theme, job.card, provider), image.bytes);
      writeFileSync(
        join(REVIEW_DIR, sidecarFileName(job.theme, job.card, provider)),
        `${JSON.stringify(buildSidecar(provider, image), null, 2)}\n`,
      );
    },
    log: (m) => console.log(m),
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
  });

  console.log(`\nSeed (review) complete:`);
  for (const o of outcomes) {
    const parts = [
      `generated ${o.generated}`,
      `already had ${o.skipped}`,
      `failed ${o.failed}`,
    ];
    if (o.abandoned) parts.push(`ABANDONED, ${o.notAttempted} not attempted`);
    console.log(`   ${o.providerId}: ${parts.join(", ")} (of ${jobs.length})`);
  }
  console.log(`Review images in: ${REVIEW_DIR}`);

  // A lane that died leaves the contact sheet with holes. Say so here rather
  // than letting the human infer "that provider draws badly" from a blank cell.
  const dead = outcomes.filter((o) => o.abandoned);
  if (dead.length > 0) {
    console.warn(
      `\n⚠️  ${dead.length} lane(s) abandoned: ${dead.map((o) => o.providerId).join(", ")}.\n` +
        `   Those providers are missing from some rows of the contact sheet because\n` +
        `   they stopped answering, NOT because they drew badly. Re-run to resume —\n` +
        `   candidates already on disk are not regenerated.`,
    );
  }
}

/**
 * The committed provenance record as it stands, or an empty one on first run
 * (#75).
 *
 * A missing file is normal — it is the state before any theme ships on this
 * pipeline. A file that exists but does not parse is NOT normal, and throws:
 * carrying on from empty would rewrite the file without the records it already
 * holds, which is the one way this record can be lost.
 */
function loadProvenance(): ProvenanceFile {
  if (!existsSync(PROVENANCE_PATH)) return emptyProvenance();
  try {
    return parseProvenance(JSON.parse(readFileSync(PROVENANCE_PATH, "utf8")));
  } catch (err) {
    throw new Error(
      `seed/provenance.json is unreadable (${String(err)}).\n` +
        `   Nothing has been written. It is a generated file — restore it with ` +
        `\`git checkout seed/provenance.json\` rather than repairing it by hand.`,
    );
  }
}

/**
 * The sidecar beside a reviewed candidate — the witness of what drew it.
 *
 * Undefined when it is absent or malformed, because there is no honest substitute:
 * re-deriving `params` from the registered adapter would record the request that
 * WOULD be made now rather than the one that was made then, and `model` cannot be
 * re-derived at all. A card with no witness gets no record.
 */
function readSidecar(
  themeName: string,
  card: NamedCard,
  provider: ImageProvider,
): ReviewSidecar | undefined {
  const path = join(REVIEW_DIR, sidecarFileName(themeName, card, provider));
  if (!existsSync(path)) return undefined;
  // Missing a record is a cost; failing to publish a reviewed card over a
  // malformed file in scratch would not be. `parseSidecar` swallows both.
  return parseSidecar(readFileSync(path, "utf8"));
}

/** Resolve a card's provider to a registered adapter, or undefined. */
function resolveProvider(theme: ThemeSeed, card: SeedCard): ImageProvider | undefined {
  const id = resolveProviderId(theme, card);
  return id === undefined ? undefined : providerById(id);
}

/**
 * Publish-time pacing, one gate per provider, created on first use.
 *
 * Only ever reached via `--allow-unreviewed`. Kept per-provider anyway so that
 * path cannot become the one place a global gate survives.
 */
const publishGates = new Map<string, () => Promise<void>>();
function publishGate(provider: ImageProvider): () => Promise<void> {
  let gate = publishGates.get(provider.id);
  if (!gate) {
    gate = makeGate(provider.minIntervalMs);
    publishGates.set(provider.id, gate);
  }
  return gate;
}

/** Read a non-negative integer from env, falling back to `def` if unset/invalid. */
function intEnv(name: string, def: number): number {
  const raw = process.env[name];
  if (raw === undefined) return def;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : def;
}

/** Run tasks with a small concurrency cap (U3-PERF). */
async function runPool<T>(
  items: readonly T[],
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
