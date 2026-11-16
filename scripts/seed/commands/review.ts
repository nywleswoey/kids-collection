/**
 * `--review`: the eager bake-off. Generate every NEW card from every selected
 * provider into seed-content/review/, one candidate per card PER lane, so a
 * human compares a subject x provider row (#63, #67). Nothing here writes to
 * the database.
 *
 * Lane-major, so it does not share the publish path's per-theme loop: a lane
 * spans every theme in one queue so its pacing is spent on generating rather
 * than on waiting at theme boundaries.
 */
import { join } from "node:path";
import { buildPrompt } from "@/seed/prompt";
import { animatedReviewFileName } from "@/seed/animated-brief";
import { isAnimationEligible } from "@/seed/animation-eligibility";
import { runBakeOff, type BakeOffJob } from "@/seed/bake-off";
import { buildSidecar, resolveProviderId, sidecarFileName } from "@/seed/review-files";
import type { SeedCard, SeedFile, ThemeSeed } from "@/seed/seed-schema";
import {
  CARD_SIZE,
  ProviderSelectionError,
  selectLanes,
  type ImageProvider,
} from "@/seed/providers";
import { cardKey } from "@/seed/publish-plan";
import type { Command } from "../args";
import { intEnv, requireDatabaseUrl, reviewPath, REVIEW_DIR, type SeedDeps } from "../deps";
import { announceRun, planRun } from "../plan";

// Retry budget per (card, provider) attempt, honoured by the lane runner.
// Per-provider concurrency and pacing are NOT env-configurable any more: they differ per provider by orders of
// magnitude — Cloudflare tolerates 720 requests a minute where a slower lane
// tolerates far less — so each adapter declares its own and the lane runner
// enforces it (#63, #67). The per-provider env knobs THAT replaces existed "so a
// keyed tier can crank them up", which is now what a committed adapter constant
// says out loud. SEED_RETRIES is an unrelated, still-live knob — see `.env.example`.
const RETRIES = intEnv("SEED_RETRIES", 5);

export async function review(
  deps: SeedDeps,
  seed: SeedFile,
  command: Extract<Command, { kind: "review" }>,
): Promise<number> {
  deps.fs.mkdir(REVIEW_DIR);
  announceRun(deps, seed, "review");

  // DATABASE_URL is required in EVERY mode since Inc24: --review reads the pool to
  // scope itself to unpublished cards. Failing fast beats silently reverting to a
  // whole-pool review run, which is the 360-image behaviour FR10 exists to remove.
  requireDatabaseUrl(deps, "`tsx --env-file=.env.local scripts/seed/index.ts` (or `pnpm seed --sync`)");

  // Which lanes will this run generate through? Resolved BEFORE any network
  // call so a missing key costs nothing, and aborts rather than quietly
  // narrowing the bake-off — a lane silently absent from a comparison looks
  // like a provider that drew badly (#67).
  let lanes: readonly ImageProvider[];
  try {
    lanes = selectLanes(command.providers);
  } catch (err) {
    if (!(err instanceof ProviderSelectionError)) throw err;
    deps.error(`\n⛔ ${err.message}\n`);
    return 1;
  }
  deps.log(`Providers: ${lanes.map((p) => p.id).join(", ")}`);

  const plan = await planRun(deps, seed, command.themes);
  if (!plan) return 1;

  await generate(deps, plan.themes, plan.planned, lanes);
  return 0;
}

/**
 * The report is per lane rather than per run, because that is the number a human
 * needs at checkpoint 2: a lane showing 9/30 explains a contact sheet with gaps
 * in it, where a single aggregate "39 reviewed" would not.
 */
async function generate(
  deps: SeedDeps,
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

  deps.log(
    `${jobs.length} new card(s) x ${lanes.length} provider(s) = ${jobs.length * lanes.length} image(s); ` +
      `${alreadyPublished} already-published card(s) skipped.`,
  );

  const outcomes = await runBakeOff(jobs, lanes, {
    size: CARD_SIZE,
    retries: RETRIES,
    buildPrompt: (card) => buildPrompt(card),
    isReviewed: (job, provider) => deps.fs.exists(reviewPath(job.theme, job.card, provider)),
    save: (job, provider, image) => {
      deps.fs.write(reviewPath(job.theme, job.card, provider), image.bytes);
      deps.fs.write(
        join(REVIEW_DIR, sidecarFileName(job.theme, job.card, provider)),
        `${JSON.stringify(buildSidecar(provider, image), null, 2)}\n`,
      );
    },
    log: (m) => deps.log(m),
    warn: (m) => deps.warn(m),
    error: (m) => deps.error(m),
  });

  deps.log(`\nSeed (review) complete:`);
  for (const o of outcomes) {
    const parts = [
      `generated ${o.generated}`,
      `already had ${o.skipped}`,
      `failed ${o.failed}`,
    ];
    if (o.notDrawn > 0) parts.push(`not drawn ${o.notDrawn}`);
    if (o.abandoned) parts.push(`ABANDONED, ${o.notAttempted} not attempted`);
    deps.log(`   ${o.providerId}: ${parts.join(", ")} (of ${jobs.length})`);
  }
  deps.log(`Review images in: ${REVIEW_DIR}`);

  // Animation lane (manual or locally generated, additive — see
  // docs/IMAGE-PIPELINE.md, "Animations"). Not part of the bake-off above: it
  // imports whichever animation the owner already dropped for a still review
  // already picked, so this has no prompt and no provider of its own. A
  // missing drop file is simply "no animation yet" for that card.
  let animatedImported = 0;
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (!isAnimationEligible(theme, card) || !planned.has(cardKey(theme.name, card.name))) continue;
      const providerId = resolveProviderId(theme, card);
      if (!providerId) continue;
      const prompt = buildPrompt(card);
      let bytes: Uint8Array | undefined;
      try {
        bytes = deps.readApprovedAnimation(prompt, providerId);
      } catch (err) {
        deps.warn(`⚠️  ${theme.name} / ${card.name}: ${String(err)}`);
        continue;
      }
      if (!bytes) continue;
      deps.fs.write(
        join(REVIEW_DIR, animatedReviewFileName(theme.name, card.name, prompt, providerId)),
        bytes,
      );
      animatedImported++;
    }
  }
  if (animatedImported > 0) {
    deps.log(`Imported ${animatedImported} approved animation(s) into ${REVIEW_DIR}.`);
  }

  const undrawn = outcomes.filter((o) => o.notDrawn > 0);
  if (undrawn.length > 0) {
    deps.log(
      `\n   ${undrawn.map((o) => `${o.providerId}: ${o.notDrawn} not drawn`).join("; ")}.\n` +
        `   No picture in the drop folder for those cards. That is not a failed drawing.`,
    );
  }

  // A lane that died leaves the contact sheet with holes. Say so here rather
  // than letting the human infer "that provider draws badly" from a blank cell.
  const dead = outcomes.filter((o) => o.abandoned);
  if (dead.length > 0) {
    deps.warn(
      `\n⚠️  ${dead.length} lane(s) abandoned: ${dead.map((o) => o.providerId).join(", ")}.\n` +
        `   Those providers are missing from some rows of the contact sheet because\n` +
        `   they stopped answering, NOT because they drew badly. Re-run to resume —\n` +
        `   candidates already on disk are not regenerated.`,
    );
  }
}
