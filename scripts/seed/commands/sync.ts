/**
 * `--sync`: publish the REVIEWED bytes of every new card, update text on
 * existing ones, and (with --allow-prune) prune what the seed dropped.
 *
 * Order matters and is pinned by `tests/seed-dispatch.test.ts`:
 *   1. the destructive guard decides BEFORE any write (Inc23 FR3–FR8);
 *   2. FR9 refuses an unreviewed or unknown-provider card BEFORE any write;
 *   3. provenance is recorded for `inserted` cards only, once, at the end (#75);
 *   4. FR12's completeness check runs in-band so it cannot be forgotten.
 */
import { join } from "node:path";
import { buildPrompt } from "@/seed/prompt";
import { blobKey } from "@/seed/keys";
import { animatedReviewFileName } from "@/seed/animated-brief";
import { isAnimationEligible } from "@/seed/animation-eligibility";
import {
  missingReviews,
  parseSidecar,
  reviewStem,
  resolveProviderId,
  sidecarFileName,
  unknownProviders,
  type NamedCard,
  type ReviewSidecar,
} from "@/seed/review-files";
import {
  emptyProvenance,
  parseProvenance,
  recordProvenance,
  serializeProvenance,
  toProvenance,
  type ProvenanceFile,
  type PublishedCard,
} from "@/seed/provenance";
import type { SeedCard, SeedFile, ThemeSeed } from "@/seed/seed-schema";
import { PROVIDER_IDS, providerById, type ImageProvider } from "@/seed/providers";
import { cardKey } from "@/seed/publish-plan";
import { comparePoolShape } from "@/seed/completeness";
import { isEmpty } from "@/seed/blast-radius";
import { isProductionDatabaseUrl, describeTarget } from "@/seed/db-target";
import {
  intEnv,
  PROVENANCE_PATH,
  readText,
  requireDatabaseUrl,
  reviewPath,
  REVIEW_DIR,
  runPool,
  type SeedDeps,
} from "../deps";
import { announceRun, planRun } from "../plan";

/**
 * Publish concurrency. Unrelated to generation pacing — this bounds Blob uploads
 * and database inserts, which have no provider and no rate limit worth modelling.
 * The old default of 2 was tuned around Pollinations' 429s and has no bearing here.
 */
const PUBLISH_CONCURRENCY = intEnv("SEED_CONCURRENCY", 4);

export interface SyncCommand {
  allowPrune: boolean;
  themes?: string[];
}

export async function sync(deps: SeedDeps, seed: SeedFile, command: SyncCommand): Promise<number> {
  announceRun(deps, seed, "sync");

  // Clear, early guardrails (better than a deep getter throw at import time).
  requireDatabaseUrl(deps, "`tsx --env-file=.env.local scripts/seed/index.ts` (or `pnpm seed --sync`)");
  if (!deps.env.blobToken) {
    deps.warn(
      "⚠️  BLOB_READ_WRITE_TOKEN not set — image uploads for new cards will fail.",
    );
  }

  // Destructive-operation guard (Inc23 FR3–FR8). Runs BEFORE any write: every
  // pool delete cascades into `collections`, so the decision to proceed has to
  // be made while nothing has happened yet. With prunes pending and no
  // --allow-prune, abort before a single row is inserted, updated or deleted.
  const isProduction = isProductionDatabaseUrl(deps.env.databaseUrl);
  const target = describeTarget(deps.env.databaseUrl);
  const radius = await deps.previewPrune(seed);
  if (!isEmpty(radius)) {
    if (!command.allowPrune) {
      deps.error(
        `\n⛔ --sync would prune ${radius.themes} theme(s) and ${radius.cards} card(s), ` +
          `destroying ${radius.collectionRows} collection row(s).\n` +
          `   Nothing has been written. Re-run with --allow-prune if that is intended.\n`,
      );
      deps.error(`   Themes: ${radius.themeNames.join(", ") || "(none)"}`);
      for (const c of radius.perChild) {
        deps.error(`   ${c.name}: ${c.rows} card row(s)`);
      }
      return 1;
    }
    await deps.confirmDestructive({ target, isProduction, radius });
  }

  const plan = await planRun(deps, seed, command.themes);
  if (!plan) return 1;
  const { themes, planned } = plan;

  // Read the provenance file BEFORE anything is published (#75). It is loaded
  // rather than merely appended to, so a corrupt one is a fail-fast with nothing
  // written — the alternative, treating an unreadable file as empty, would clobber
  // every record in it. Note this is the only way provenance can stop a run, and
  // it stops it before the run starts; once cards are being published it never
  // refuses one. That is FR9's job.
  const provenanceBefore = loadProvenance(deps);

  // ── FR9: refuse to publish an image no human has seen. Before any write, on
  // every insert path, and with no override — the invariant ("no unreviewed
  // content path to a child, ever") carries no mode qualifier and no bypass
  // flag. `--allow-unreviewed` existed for this and was removed: it was the
  // only way `insertCardIfNew` ever saw unreviewed bytes.
  //
  // Insert-scoped: the already-published cards are not in `plan`, so they never
  // need a review file and no back-fill of seed-content/review/ is required.
  //
  // An unknown provider id is checked FIRST and is not overridable. It is an
  // authoring mistake — a typo, or an adapter that has since been retired — and
  // reporting it as "no reviewed image" would send the author to re-run a review
  // that could never satisfy the guard (#67).
  const unknown = unknownProviders(themes, planned, providerById);
  if (unknown.length > 0) {
    deps.error(`\n⛔ ${unknown.length} card(s) name a provider that is not registered:\n`);
    for (const u of unknown) deps.error(`   ${u.theme} / ${u.card} → "${u.providerId}"`);
    deps.error(
      `\n   Registered: ${PROVIDER_IDS.join(", ")}\n` +
        `   Nothing has been written. Fix the \`provider\` value in seed-content/cards.json.\n`,
    );
    return 1;
  }

  const unreviewed = missingReviews(themes, planned, providerById, (name) =>
    deps.fs.exists(join(REVIEW_DIR, name)),
  );
  if (unreviewed.length > 0) {
    deps.error(
      `\n⛔ ${unreviewed.length} card(s) would be inserted with no reviewed image:\n`,
    );
    for (const p of unreviewed) {
      deps.error(`   ${p.theme} / ${p.card} — ${p.reason}`);
    }
    deps.error(
      `\n   Nothing has been written. Run \`pnpm seed --review\` first, and look at\n` +
        `   every image. Cards marked "no provider chosen" need a \`provider\` on the\n` +
        `   card or its theme in seed-content/cards.json — that is the bake-off pick.\n` +
        `   There is no bypass flag.\n`,
    );
    return 1;
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
  // seed-content/cards.json makes it the most recent (Inc21 FR2).
  for (const theme of themes) {
    const themeId = await deps.upsertTheme(
      theme.name,
      seed.themes.indexOf(theme),
      theme.provider ?? null,
    );

    await runPool(theme.cards, PUBLISH_CONCURRENCY, async (card) => {
      try {
        const isNew = planned.has(cardKey(theme.name, card.name));

        // Already published: update text only (no image regeneration).
        if (!isNew) {
          await deps.updateCardMeta({
            themeId,
            name: card.name,
            eduText: card.eduText,
            sourceUrl: card.sourceUrl,
          });
          report.updated++;
          deps.log(`✎ updated ${theme.name} / ${card.name} (text only)`);
          return;
        }

        // Publish the REVIEWED bytes (FR8/FR9) — the only path left. The FR9
        // check above already proved a provider resolves and its review file
        // exists for every planned card, so there is nothing to fall back to.
        const provider = resolveProvider(theme, card)!;
        const reviewFile = reviewPath(theme.name, card, provider);

        const bytes = deps.fs.read(reviewFile);
        const sidecar = readSidecar(deps, theme.name, card, provider);
        if (!sidecar) {
          deps.warn(
            `⚠️  ${theme.name} / ${card.name}: no readable sidecar beside the reviewed image — ` +
              `publishing it, but nothing will record what drew it.`,
          );
        }
        report.reused++;

        const imageUrl = await deps.uploadImage(blobKey(theme.name, card.name), bytes);

        // Animation lane (manual or locally generated, additive — see
        // docs/IMAGE-PIPELINE.md, "Animations"). Published only from the
        // REVIEWED copy `--review` already imported; a card with none gets
        // `animatedUrl: undefined` and behaves exactly as it did before this
        // lane existed.
        let animatedUrl: string | undefined;
        if (isAnimationEligible(theme, card)) {
          const animFile = join(
            REVIEW_DIR,
            animatedReviewFileName(theme.name, card.name, buildPrompt(card), provider.id),
          );
          if (deps.fs.exists(animFile)) {
            const animBytes = deps.fs.read(animFile);
            animatedUrl = await deps.uploadAnimation(blobKey(theme.name, card.name), animBytes);
          }
        }

        const res = await deps.insertCardIfNew({
          themeId,
          name: card.name,
          rarity: card.rarity,
          imageUrl,
          eduText: card.eduText,
          sourceUrl: card.sourceUrl,
          animatedUrl,
        });
        if (res === "inserted") {
          report.inserted++;
          // Recorded on `inserted` only: this is the run that put these bytes in
          // a child's binder (#75). A `skipped` card was published by some
          // earlier run, whose record — or absence of one — is the true one.
          // `reviewed` is always true: every insert now publishes bytes read
          // straight from `seed-content/review/`, which only exist once a human
          // has seen them.
          if (sidecar) {
            publishedCards.push({
              theme: theme.name,
              card: card.name,
              provenance: toProvenance(sidecar, reviewStem(theme.name, card, provider), true),
            });
          }
          deps.log(`✓ inserted ${theme.name} / ${card.name}`);
        } else {
          report.skipped++;
        }
      } catch (err) {
        report.failed++;
        deps.error(`✗ ${theme.name} / ${card.name}: ${String(err)}`);
      }
    });

    // Prune cards removed from this theme in the seed.
    const n = await deps.deleteCardsNotIn(
      themeId,
      theme.cards.map((c) => c.name),
    );
    report.prunedCards += n;
    if (n > 0) deps.log(`🗑️  pruned ${n} card(s) from ${theme.name}`);
  }

  // Prune whole themes dropped from the seed (name no longer in cards.json).
  report.prunedThemes = await deps.deleteThemesNotIn(seed.themes.map((t) => t.name));
  if (report.prunedThemes > 0) {
    deps.log(`🗑️  pruned ${report.prunedThemes} dropped theme(s)`);
  }

  // ── #75: what drew each card this run published, made durable.
  //
  // After the inserts rather than alongside them: a file rewritten per card is a
  // torn record if the run dies halfway, and this one is a git artifact whose
  // whole value is being reviewable as a single diff.
  if (publishedCards.length > 0) {
    deps.fs.write(
      PROVENANCE_PATH,
      serializeProvenance(recordProvenance(provenanceBefore, publishedCards)),
    );
    deps.log(
      `✎ seed-content/provenance.json: recorded what drew ${publishedCards.length} newly published card(s). ` +
        `Commit it with the theme.`,
    );
  }

  deps.log(`\nSeed (sync) complete:`, report);

  // ── FR12: did every theme actually land? In-band, so it cannot be forgotten.
  // The schema already proved the FILE is correct, so a shortfall here is a failed
  // insert (a card that 429'd out), never an authoring error — which is why the
  // remedy is always "re-run --sync", never prune and never reset.
  //
  // Scoped to `themes`, not the full seed: an out-of-scope theme has zero
  // published cards by design and would otherwise read as a shortfall on
  // every run that didn't select it.
  const shortfalls = comparePoolShape({ themes: [...themes] }, await deps.readPublishedShape());
  if (shortfalls.length === 0) {
    deps.log(`✓ completeness: all ${themes.length} theme(s) published in full.`);
    return 0;
  }
  deps.error(`\n⛔ completeness: ${shortfalls.length} (theme, rarity) short:\n`);
  for (const s of shortfalls) {
    deps.error(`   ${s.theme} / ${s.rarity}: expected ${s.expected}, found ${s.found}`);
  }
  deps.error(
    `\n   Re-run \`pnpm seed --sync\` — it is idempotent and inserts only what is\n` +
      `   missing. Never prune, never reset. No child has lost anything; the only\n` +
      `   consequence is that those set-completion rewards are unreachable until\n` +
      `   the theme is whole.\n`,
  );
  return 1;
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
function loadProvenance(deps: SeedDeps): ProvenanceFile {
  if (!deps.fs.exists(PROVENANCE_PATH)) return emptyProvenance();
  try {
    return parseProvenance(JSON.parse(readText(deps, PROVENANCE_PATH)));
  } catch (err) {
    throw new Error(
      `seed-content/provenance.json is unreadable (${String(err)}).\n` +
        `   Nothing has been written. It is a generated file — restore it with ` +
        `\`git checkout seed-content/provenance.json\` rather than repairing it by hand.`,
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
  deps: SeedDeps,
  themeName: string,
  card: NamedCard,
  provider: ImageProvider,
): ReviewSidecar | undefined {
  const path = join(REVIEW_DIR, sidecarFileName(themeName, card, provider));
  if (!deps.fs.exists(path)) return undefined;
  // Missing a record is a cost; failing to publish a reviewed card over a
  // malformed file in scratch would not be. `parseSidecar` swallows both.
  return parseSidecar(readText(deps, path));
}

/** Resolve a card's provider to a registered adapter, or undefined. */
function resolveProvider(theme: ThemeSeed, card: SeedCard): ImageProvider | undefined {
  const id = resolveProviderId(theme, card);
  return id === undefined ? undefined : providerById(id);
}
