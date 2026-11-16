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
 *                                 the rest sit in cards.json unjudged. Pruning is NOT
 *                                 scoped: --allow-prune's blast radius still covers
 *                                 everything dropped from the full cards.json. No flag
 *                                 means every theme, as before.
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
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseSeedArgs, SeedArgsError, type Command } from "./args";
import { realSeedDeps, type SeedDeps } from "./deps";
import { checkImages } from "./commands/check-images";
import { blobBudget } from "./commands/blob-budget";
import { checkUrls } from "./commands/check-urls";
import { supergrokExport } from "./commands/supergrok-export";
import { review } from "./commands/review";
import { sync } from "./commands/sync";

export type { SeedDeps } from "./deps";

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
 * The seed CLI's dispatcher (A2): every `Command` `parseSeedArgs` can produce,
 * routed to its file under `./commands/`. Takes injected deps the way
 * `runBakeOff` does, so `tests/seed-dispatch.test.ts` can drive it with fakes.
 * Resolves to the process exit code.
 *
 * `--check-images` and `--blob-budget` run BEFORE `loadSeed`: they read the
 * database and touch no seed data, so an authoring error in cards.json must
 * not stop them answering a question about the live pool.
 */
export async function runSeed(command: Command, deps: SeedDeps = realSeedDeps()): Promise<number> {
  switch (command.kind) {
    case "check-images":
      return checkImages(deps);
    case "blob-budget":
      return blobBudget(deps);
  }

  const seed = deps.loadSeed(); // fail-fast validation (FR2–FR5)

  switch (command.kind) {
    case "check-urls":
      return checkUrls(deps, seed);
    case "supergrok-export":
      return supergrokExport(deps, seed);
    case "review":
      return review(deps, seed, command);
    case "sync":
      return sync(deps, seed, command);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
