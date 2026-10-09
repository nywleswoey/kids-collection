/**
 * Offline seed CLI — builds the card pool. NOT in the request path.
 *
 *   pnpm seed --check-urls        check every sourceUrl in the seed file, then exit
 *   pnpm seed --check-images      weigh every PUBLISHED card image and report any that
 *                                 is too sparse to be a picture (#78), then exit
 *   pnpm seed --blob-budget       weigh the whole Blob store against the plan's storage
 *                                 allowance and project how many themes still fit, per
 *                                 lane (#79), then exit
 *   pnpm seed --review            generate images for NEW cards to seed-content/review/,
 *                                 from EVERY registered lane (the bake-off)
 *   pnpm seed --review --providers=cloudflare-sdxl
 *                                 narrow the bake-off to named provider(s)
 *   pnpm seed --supergrok-export  write the manual-lane brief: one entry per card
 *                                 the bake-off would draw, with the exact prompt
 *                                 and the filename to save the picture as
 *   pnpm seed --review --providers=supergrok-manual
 *                                 import pictures from seed-content/supergrok-drop/
 *                                 as that lane's candidates. A card with no picture
 *                                 is "not drawn", not a failed generation.
 *   pnpm seed --sync              DELTA: image-generate only NEW cards, update text
 *                                 (eduText/sourceUrl) on existing ones, and prune
 *                                 themes/cards dropped from the seed. No image regen
 *                                 for unchanged cards. Refuses to insert a card with
 *                                 no reviewed image — there is no bypass flag.
 *   pnpm seed --sync --allow-prune
 *                                 as above, permitting the prune. Without this flag a
 *                                 sync with pending prunes aborts before ANY write.
 *   pnpm seed --review --themes="Ice Age Beasts,Robots"
 *   pnpm seed --sync --themes="Ice Age Beasts,Robots"
 *                                 narrow --review or --sync to the named theme(s) —
 *                                 by exact theme name, comma-separated. Every other
 *                                 theme in cards.json is left untouched: not reviewed,
 *                                 not published, not pruned, and not counted against
 *                                 FR9/FR12. This is how a batch of new themes can be
 *                                 authored together but published two at a time, while
 *                                 the rest sit in cards.json unjudged. --allow-prune's
 *                                 blast radius and the completeness check (FR12) are
 *                                 scoped the same way. No flag means every theme, as
 *                                 before.
 *
 * No command flag means `--review`. Unknown flags, two command flags, or a
 * modifier on the wrong command are rejected before anything runs (`./args.ts`).
 *
 * Requires DATABASE_URL (all modes, even --check-urls: the DB module loads at
 * startup) and, for --sync, BLOB_READ_WRITE_TOKEN.
 * `--review` additionally requires each selected provider's key; see `.env.example`.
 * `supergrok-manual` has no key. It sits out unless named.
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
 * `archive/aidlc-v1/construction/build-and-test/increment24-vehicle-themes-build-and-test.md`
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
 * records the winner in `seed-content/cards.json` — a theme-level `provider` default plus
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
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadSeed } from "@/shared/pool/loader";
import { buildPrompt } from "@/shared/pool/prompt";
import {
  planManualBrief,
  renderManualBrief,
  SUPERGROK_BRIEF_NAME,
  SUPERGROK_DROP_DIR,
} from "@/shared/pool/manual-brief";
import { uploadImage, uploadAnimation } from "@/shared/pool/image";
import { blobKey } from "@/shared/pool/keys";
import { animatedReviewFileName, readApprovedAnimation } from "@/shared/pool/animated-brief";
import { runBakeOff, type BakeOffJob } from "@/shared/pool/bake-off";
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
} from "@/shared/pool/review-files";
import {
  emptyProvenance,
  parseProvenance,
  recordProvenance,
  serializeProvenance,
  toProvenance,
  type ProvenanceFile,
  type PublishedCard,
} from "@/shared/pool/provenance";
import { CARDS_PER_THEME } from "@/shared/pool/seed-schema";
import type { SeedCard, SeedFile, ThemeSeed } from "@/shared/pool/seed-schema";
import {
  CARD_SIZE,
  PROVIDER_IDS,
  PROVIDERS,
  ProviderSelectionError,
  providerById,
  selectLanes,
  type ImageProvider,
} from "@/shared/pool/providers";
import { planInserts, cardKey } from "@/shared/pool/publish-plan";
import { comparePoolShape } from "@/shared/pool/completeness";
import {
  listPublishedCardKeys,
  readPublishedImages,
  readPublishedShape,
} from "@/shared/pool/pool-reads";
import { checkSourceUrls } from "@/shared/pool/url-check";
import { auditPublishedImages } from "@/shared/pool/blank-audit";
import {
  buildBlobBudget,
  formatBytes,
  readStoreObjects,
  WARN_FRACTION,
  type BlobBudget,
} from "@/shared/pool/blob-budget";
import {
  upsertTheme,
  insertCardIfNew,
  updateCardMeta,
  deleteThemesNotIn,
  deleteCardsNotIn,
} from "@/shared/pool/writer";
import { previewPrune, isEmpty } from "@/shared/pool/blast-radius";
import { isProductionDatabaseUrl, describeTarget } from "@/shared/pool/db-target";
import { confirmDestructive } from "./guard";
import { parseSeedArgs, SeedArgsError, type Command } from "./args";
import type { Rarity } from "@/lib/types";

const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed-content", "review");
/** Committed, generated, never hand-edited — see `shared/pool/provenance.ts` (#75). */
const PROVENANCE_PATH = join(process.cwd(), "seed-content", "provenance.json");

// Retry budget per (card, provider) attempt, honoured by the lane runner.
// Per-provider concurrency and pacing are NOT env-configurable any more: they differ per provider by orders of
// magnitude — Cloudflare tolerates 720 requests a minute where a slower lane
// tolerates far less — so each adapter declares its own and the lane runner
// enforces it (#63, #67). The per-provider env knobs THAT replaces existed "so a
// keyed tier can crank them up", which is now what a committed adapter constant
// says out loud. SEED_RETRIES/SEED_CONCURRENCY below are unrelated, still-live
// knobs — see `.env.example`.
const RETRIES = intEnv("SEED_RETRIES", 5);

/**
 * Publish concurrency. Unrelated to generation pacing — this bounds Blob uploads
 * and database inserts, which have no provider and no rate limit worth modelling.
 * The old default of 2 was tuned around Pollinations' 429s and has no bearing here.
 */
const PUBLISH_CONCURRENCY = intEnv("SEED_CONCURRENCY", 4);

type Mode = "review" | "sync";

/**
 * Everything `runSeed` reads, writes or asks (A2) — the same idea as
 * `BakeOffDeps` in `bake-off.ts`, at the top-level dispatcher instead of one
 * lane. `realSeedDeps()` wires the database, Blob, the filesystem and the TTY
 * guard; a test injects fakes to check the ordering invariants (prune decision
 * and FR9 refusal before any write, provenance for `inserted` only) with no
 * database at all.
 */
export interface SeedDeps {
  env: { databaseUrl?: string; blobToken?: string };
  loadSeed: () => SeedFile;
  listPublishedCardKeys: typeof listPublishedCardKeys;
  readPublishedImages: typeof readPublishedImages;
  readPublishedShape: typeof readPublishedShape;
  upsertTheme: typeof upsertTheme;
  insertCardIfNew: typeof insertCardIfNew;
  updateCardMeta: typeof updateCardMeta;
  deleteCardsNotIn: typeof deleteCardsNotIn;
  deleteThemesNotIn: typeof deleteThemesNotIn;
  previewPrune: typeof previewPrune;
  confirmDestructive: typeof confirmDestructive;
  uploadImage: typeof uploadImage;
  uploadAnimation: typeof uploadAnimation;
  readApprovedAnimation: (prompt: string, providerId: string) => Uint8Array | undefined;
  fs: {
    exists: (path: string) => boolean;
    read: (path: string) => Uint8Array;
    write: (path: string, data: string | Uint8Array) => void;
    mkdir: (path: string) => void;
  };
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function realSeedDeps(): SeedDeps {
  return {
    env: {
      databaseUrl: process.env.DATABASE_URL,
      blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    },
    loadSeed: () => loadSeed(SEED_PATH),
    listPublishedCardKeys,
    readPublishedImages,
    readPublishedShape,
    upsertTheme,
    insertCardIfNew,
    updateCardMeta,
    deleteCardsNotIn,
    deleteThemesNotIn,
    previewPrune,
    confirmDestructive,
    uploadImage,
    uploadAnimation,
    readApprovedAnimation: (prompt, providerId) => readApprovedAnimation(prompt, providerId),
    fs: {
      exists: existsSync,
      read: (path) => new Uint8Array(readFileSync(path)),
      write: (path, data) => writeFileSync(path, data),
      mkdir: (path) => mkdirSync(path, { recursive: true }),
    },
    log: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
  };
}

function readText(deps: SeedDeps, path: string): string {
  return new TextDecoder().decode(deps.fs.read(path));
}

/** Absolute path of one bake-off candidate. */
function reviewPath(themeName: string, card: NamedCard, provider: ImageProvider): string {
  return join(REVIEW_DIR, reviewFileName(themeName, card, provider));
}

/**
 * Print a store budget (#79). Returns true when the run should exit non-zero,
 * which is how the runbook's Hard stop is detectable from a script.
 *
 * Extracted rather than inlined in `main`, for the reason the neighbouring
 * commands are: presentation is the bulk of it, and `main` is already the
 * longest thing here.
 */
function requireDatabaseUrl(deps: SeedDeps, usage: string): void {
  if (!deps.env.databaseUrl) {
    throw new Error(`DATABASE_URL is not set. Run with your env loaded, e.g. ${usage}.`);
  }
}

function reportBlobBudget(budget: BlobBudget, publishedCount: number): boolean {
  const pct = (budget.usedFraction * 100).toFixed(1);
  console.log(
    `\n   stored     ${formatBytes(budget.store.totalBytes)} of ` +
      `${formatBytes(budget.ceilingBytes)}  (${pct}%)\n` +
      `   objects    ${budget.store.count}  for ${publishedCount} published card(s)\n` +
      `   per card   mean ${formatBytes(budget.store.meanBytes)}, ` +
      `median ${formatBytes(budget.store.medianBytes)}, ` +
      `max ${formatBytes(budget.store.maxBytes)}\n` +
      `   free       ${formatBytes(budget.freeBytes)}`,
  );

  if (budget.orphans.count > 0) {
    console.log(
      `\n   ${budget.orphans.count} object(s), ${formatBytes(budget.orphans.bytes)}, that no ` +
        `published card points at.\n` +
        `   Re-publishing a card writes a NEW object rather than replacing the old\n` +
        `   one, and the allowance is charged for both. Reported, not deleted: look\n` +
        `   before removing anything, because a card whose row was pruned and whose\n` +
        `   bytes were kept looks exactly the same from here.`,
    );
  }

  console.log(`\n   Themes of ${CARDS_PER_THEME} cards that still fit, per lane:`);
  for (const p of budget.projections) {
    const weight = p.perCardBytes === null ? "UNMEASURED" : `${formatBytes(p.perCardBytes)}/card`;
    console.log(`     ${p.id.padEnd(18)} ${weight.padEnd(16)} ${p.themes ?? "—"}`);
  }
  // Said every run, not only when it warns: this covers Blob storage and
  // nothing else, and the meter nearest its cap when #79 measured was one it
  // cannot see. A report silently scoped to one meter is how the others get
  // assumed instead of measured.
  console.log(
    `\n   Storage only. Image transformations are a deployment meter with no read\n` +
      `   path from here (2,998 of 5,000 per 30 days on 2026-08-15, the tightest of\n` +
      `   them) — check the team's usage page for that one. The ceiling above is the\n` +
      `   Hobby allowance, hardcoded; on a different plan it is wrong.`,
  );

  if (budget.overWarnLine) {
    console.warn(
      `\n⚠️  past ${(WARN_FRACTION * 100).toFixed(0)}% of the storage allowance.\n` +
        `   Exceeding it does not produce a bill on the Hobby plan — it cuts off access\n` +
        `   to the store until the 30-day window rolls, so cards whose optimized variant\n` +
        `   is not already cached render as their alt text. Publish nothing further\n` +
        `   until this is dealt with.`,
    );
    return true;
  }
  return false;
}

async function main() {
  let command: Command;
  try {
    command = parseSeedArgs(process.argv.slice(2));
  } catch (err) {
    if (!(err instanceof SeedArgsError)) throw err;
    console.error(`\n⛔ ${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = await runSeed(command);
}

/**
 * The seed CLI's dispatcher (A2) — every `Command` `parseSeedArgs` can
 * produce, in one switch, instead of `main()`'s old chain of
 * `process.argv.includes(...)` checks that resolved conflicts by which `if`
 * happened to run first. Split out so `main()` stays "parse, then dispatch"
 * and this can take injected deps, the way `runBakeOff` does. Resolves to the
 * process exit code.
 */
export async function runSeed(command: Command, deps: SeedDeps = realSeedDeps()): Promise<number> {
  const mode: Mode = command.kind === "sync" ? "sync" : "review";

  // ── --check-images: weigh every PUBLISHED card's art and report anything too
  // sparse to be a picture (#78). Standalone; runs and exits.
  //
  // The seam refuses a blank frame at generation time, which protects everything
  // published from here on and nothing published before — a card already in the
  // pool is never re-generated and never re-audited. This is the only pass over
  // those bytes, so it is a command rather than a one-off script.
  //
  // Ahead of `loadSeed`, unlike --check-urls: this reads the DATABASE and touches
  // no seed data, so failing it on an unrelated authoring error in cards.json
  // would refuse to answer a question about the live pool for no reason.
  if (command.kind === "check-images") {
    const published = await deps.readPublishedImages();
    deps.log(`Weighing ${published.length} published card image(s)…`);
    const report = await auditPublishedImages(published, { size: CARD_SIZE });

    // Printed FIRST, because everything below is a statement about the images
    // that were actually weighed, and this says which ones were not.
    if (report.unreadable.length > 0) {
      deps.warn(`\n⚠️  ${report.unreadable.length} image(s) could not be weighed:\n`);
      for (const u of report.unreadable) {
        deps.warn(`   ${u.theme} / ${u.card} — ${u.reason}\n        ${u.url}`);
      }
      deps.warn(
        `\n   That is a fact about the request, NOT about the art. Nothing here needs\n` +
          `   republishing on this evidence — but nothing here has been cleared either.`,
      );
    }
    const weighed = report.checked - report.unreadable.length;
    if (report.suspects.length === 0) {
      // Never "all clear" over images nobody weighed — that is an all-clear
      // earned by not looking, which is the shape of the bug this issue is about.
      deps.log(`✓ no blank frames among the ${weighed} image(s) weighed (of ${report.checked}).`);
      return report.unreadable.length > 0 ? 1 : 0;
    }
    deps.error(
      `\n⛔ ${report.suspects.length} of ${weighed} weighed image(s) look blank:\n`,
    );
    for (const s of report.suspects) {
      deps.error(
        `   ${s.theme} / ${s.card} — ${s.byteLength} bytes ` +
          `(${s.bytesPerPixel.toFixed(4)} B/px)\n        ${s.url}`,
      );
    }
    deps.error(
      `\n   Look at each one before acting: this weighs bytes, it does not decode\n` +
        `   pixels. Republishing a card means removing it from the pool and running\n` +
        `   --review then --sync, which destroys its collection rows — read the\n` +
        `   blast-radius guard first.\n`,
    );
    return 1;
  }

  // ── --blob-budget: weigh the whole store against the plan's allowance and say
  // how many more themes fit, per lane (#79). Standalone; runs and exits.
  //
  // Standalone rather than in-band on --sync, which is the opposite of
  // `comparePoolShape`'s choice and for the opposite reason. A short theme is a
  // fault of the run that just happened, so it has to be caught inside it. Store
  // pressure is a slow trend across many runs, and wiring it into --sync would
  // add a `list()` to every publish and give a publish a new way to fail for a
  // reason that has nothing to do with the cards being published. The runbook
  // calls this before a bake-off instead, which is the moment the answer can
  // still change what you do.
  //
  // Reads the STORE, not the pool: `put()` adds a random suffix, so a re-publish
  // strands the old object and the pool's own URLs cannot see it. Read-only —
  // stranded bytes are reported and never deleted.
  if (command.kind === "blob-budget") {
    deps.log(`Weighing the Blob store…`);
    const [objects, published] = await Promise.all([
      readStoreObjects(),
      deps.readPublishedImages(),
    ]);
    const budget = buildBlobBudget({
      objects,
      liveUrls: new Set(
        published.flatMap((p) => (p.animatedUrl ? [p.url, p.animatedUrl] : [p.url])),
      ),
      lanes: PROVIDERS,
    });
    return reportBlobBudget(budget, published.length) ? 1 : 0;
  }

  const seed = deps.loadSeed(); // fail-fast validation (FR2–FR5)

  // ── --check-urls: standalone, network-only, DB-free. Runs and exits (FR11).
  // Deliberately not coupled to a publish: it is safe to run at any point during
  // authoring, and a publish should not fail for a reason unrelated to publishing.
  if (command.kind === "check-urls") {
    const total = seed.themes.reduce((n, t) => n + t.cards.length, 0);
    deps.log(`Checking ${total} sourceUrl(s)…`);
    const failures = await checkSourceUrls(seed);
    if (failures.length === 0) {
      deps.log(`✓ all ${total} sourceUrl(s) returned 200.`);
      return 0;
    }
    deps.error(`\n⛔ ${failures.length} of ${total} sourceUrl(s) failed:\n`);
    for (const f of failures) {
      deps.error(`   [${f.status}] ${f.theme} / ${f.card}\n        ${f.url}`);
    }
    return 1;
  }

  // ── --supergrok-export: the manual lane's brief. Standalone; runs and exits.
  //
  // Same card set `--review` would draw (planned inserts), so the file the
  // owner works through cannot disagree with the bake-off. Reads the pool to
  // learn which cards are already published. Writes one markdown file into the
  // drop folder and does not generate, upload, or insert anything.
  if (command.kind === "supergrok-export") {
    // parseSeedArgs already refuses --supergrok-export combined with --sync
    // (a conflicting-command-flags error) before this ever runs.
    requireDatabaseUrl(deps, "`tsx --env-file=.env.local scripts/seed/index.ts --supergrok-export`");
    const published = await deps.listPublishedCardKeys();
    const planned = new Set(planInserts(seed, published).map((p) => cardKey(p.theme, p.card)));
    const entries = planManualBrief(seed.themes, planned);
    const dropDir = join(process.cwd(), SUPERGROK_DROP_DIR);
    deps.fs.mkdir(dropDir);
    const briefPath = join(dropDir, SUPERGROK_BRIEF_NAME);
    deps.fs.write(briefPath, renderManualBrief(entries));
    deps.log(
      `${entries.length} card(s) the bake-off would draw.\n` +
        `Brief: ${briefPath}\n` +
        `Save each picture into ${dropDir} under the name the brief gives, then:\n` +
        `  pnpm seed --review --providers=supergrok-manual`,
    );
    return 0;
  }

  // Every other Command kind returned above; narrows `command` for the rest
  // of this function to the two that share the plan/guard/publish pipeline.
  if (command.kind !== "review" && command.kind !== "sync") {
    throw new Error(`internal: unhandled seed command "${(command as Command).kind}"`);
  }

  if (mode === "review") deps.fs.mkdir(REVIEW_DIR);

  const totalCards = seed.themes.reduce((n, t) => n + t.cards.length, 0);
  deps.log(
    `Seed starting — mode=${mode}, ${seed.themes.length} themes, ${totalCards} cards.`,
  );

  // Clear, early guardrails (better than a deep getter throw at import time).
  // DATABASE_URL is required in EVERY mode since Inc24: --review reads the pool to
  // scope itself to unpublished cards. Failing fast beats silently reverting to a
  // whole-pool review run, which is the 360-image behaviour FR10 exists to remove.
  requireDatabaseUrl(deps, "`tsx --env-file=.env.local scripts/seed/index.ts` (or `pnpm seed --sync`)");
  if (mode !== "review" && !deps.env.blobToken) {
    deps.warn(
      "⚠️  BLOB_READ_WRITE_TOKEN not set — image uploads for new cards will fail.",
    );
  }

  // Which lanes will this run generate through? Resolved BEFORE any destructive
  // guard or network call so a missing key costs nothing, and aborts rather than
  // quietly narrowing the bake-off — a lane silently absent from a comparison
  // looks like a provider that drew badly (#67).
  let lanes: readonly ImageProvider[] = [];
  if (command.kind === "review") {
    try {
      lanes = selectLanes(command.providers);
    } catch (err) {
      if (!(err instanceof ProviderSelectionError)) throw err;
      deps.error(`\n⛔ ${err.message}\n`);
      return 1;
    }
    deps.log(`Providers: ${lanes.map((p) => p.id).join(", ")}`);
  }

  // Destructive-operation guard (Inc23 FR3–FR8). Runs BEFORE any write: every
  // pool delete cascades into `collections`, so the decision to proceed has to
  // be made while nothing has happened yet.
  const isProduction = isProductionDatabaseUrl(deps.env.databaseUrl);
  const target = describeTarget(deps.env.databaseUrl);

  // Sync prunes anything missing from the seed file, and those deletes cascade
  // into the children's cards. Decide up front: with prunes pending and no
  // --allow-prune, abort before a single row is inserted, updated or deleted.
  if (command.kind === "sync") {
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
  }

  // Which cards would this run insert?
  const published = await deps.listPublishedCardKeys();
  const plan = planInserts(seed, published);
  const planned = new Set(plan.map((p) => cardKey(p.theme, p.card)));

  // --themes narrows this run to the named theme(s) — see the header comment.
  // Resolved against the FULL seed so an unscoped theme is never mistaken for a
  // typo in a scoped one; everything below (the bake-off, FR9's gates, the
  // publish loop, and FR12's completeness check) then sees only this subset.
  // Pruning is deliberately NOT scoped: `previewPrune`/`deleteThemesNotIn` compare
  // against the full seed, so an unscoped theme — still present in cards.json,
  // just not part of this run — is never pruned for being out of scope.
  let themes: readonly ThemeSeed[] = seed.themes;
  if (command.themes !== undefined) {
    const wanted = new Set(command.themes);
    const known = new Set(seed.themes.map((t) => t.name));
    const unknown = [...wanted].filter((name) => !known.has(name));
    if (unknown.length > 0) {
      deps.error(
        `\n⛔ --themes names theme(s) not found in seed-content/cards.json: ${unknown.join(", ")}\n`,
      );
      return 1;
    }
    themes = seed.themes.filter((t) => wanted.has(t.name));
    deps.log(`Scoped to ${themes.length} theme(s): ${themes.map((t) => t.name).join(", ")}`);
  }

  // ── --review: the eager bake-off. Lane-major, so it does not share the
  // publish path's per-theme loop — nothing here writes to the database, and a
  // lane spans every theme in one queue so its pacing is spent on generating
  // rather than on waiting at theme boundaries.
  if (command.kind === "review") {
    await review(deps, themes, planned, lanes);
    return 0;
  }

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
  for (const [sortOrder, theme] of themes.entries()) {
    const themeId = await deps.upsertTheme(theme.name, sortOrder);

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

        // Animation lane (manual, legendary-only, additive — see AGENTS.md's
        // animation entry). Published only from the REVIEWED copy `--review`
        // already imported; a card with none gets `animatedUrl: undefined` and
        // behaves exactly as it did before this lane existed.
        let animatedUrl: string | undefined;
        if (card.rarity === "legendary") {
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

    // Sync: prune cards removed from this theme in the seed.
    if (mode === "sync") {
      const n = await deps.deleteCardsNotIn(
        themeId,
        theme.cards.map((c) => c.name),
      );
      report.prunedCards += n;
      if (n > 0) deps.log(`🗑️  pruned ${n} card(s) from ${theme.name}`);
    }
  }

  // Sync: prune whole themes dropped from the seed (name no longer in cards.json).
  if (mode === "sync") {
    report.prunedThemes = await deps.deleteThemesNotIn(themes.map((t) => t.name));
    if (report.prunedThemes > 0) {
      deps.log(`🗑️  pruned ${report.prunedThemes} dropped theme(s)`);
    }
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

  deps.log(`\nSeed (${mode}) complete:`, report);

  // ── FR12: did every theme actually land? In-band, so it cannot be forgotten.
  // The schema already proved the FILE is correct, so a shortfall here is a failed
  // insert (a card that 429'd out), never an authoring error — which is why the
  // remedy is always "re-run --sync", never prune and never reset.
  if (mode === "sync") {
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
  return 0;
}

/**
 * `--review`: generate every NEW card from every selected provider.
 *
 * The report is per lane rather than per run, because that is the number a human
 * needs at checkpoint 2: a lane showing 9/30 explains a contact sheet with gaps
 * in it, where a single aggregate "39 reviewed" would not.
 */
async function review(
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

  // Animation lane (manual, legendary-only, additive — see AGENTS.md's animation entry).
  // Not part of the bake-off above: `image_to_video` animates whichever still
  // review already picked, so this has no prompt and no provider of its own.
  // A missing drop file is simply "no animation yet" for that card.
  let animatedImported = 0;
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (card.rarity !== "legendary" || !planned.has(cardKey(theme.name, card.name))) continue;
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

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
