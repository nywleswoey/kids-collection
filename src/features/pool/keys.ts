/**
 * How a card's stored artifacts are named (Inc24 FR7).
 *
 * Pure — `node:crypto` only, no I/O, no new dependency.
 *
 * There are two names, and they deliberately differ:
 *
 *   blobKey    stable, prompt-independent. One published object per card.
 *   reviewKey  content-addressed by the FULL prompt, so a prompt edit can never
 *              leave a stale reviewed image standing in for the new one.
 *
 * Both derive their slug from the same `slug()`, which is why they live together:
 * before Inc24 the slug was a private helper in scripts/seed/index.ts feeding both
 * uses, and FR7 changes exactly one of them.
 */
import { createHash } from "node:crypto";
import { buildPrompt } from "./prompt";
import type { SeedCard } from "./seed-schema";

/** Lowercase, non-alphanumerics collapsed to "-", no leading/trailing dash. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Pathname passed to Vercel Blob (`uploadImage` prefixes `cards/`). Unchanged by
 * Inc24 (Q6=A): the hash exists to make *review* staleness impossible and has no
 * job in Blob, and all 300 pre-existing objects are named this way.
 */
export function blobKey(themeName: string, cardName: string): string {
  return slug(`${themeName}-${cardName}`);
}

/**
 * First 8 hex chars of sha256 over the prompt actually sent to the image service.
 *
 * Hashes `buildPrompt(card)`, NOT `card.imagePrompt` (D4): buildPrompt appends
 * ART_STYLE, so changing ART_STYLE changes what every card renders as. Hashing the
 * raw imagePrompt would leave that change invisible to the review gate — the exact
 * failure mode FR7 exists to remove. The cost is that an ART_STYLE edit invalidates
 * every review file and forces a full re-review, which is the correct consequence.
 */
export function promptHash(card: Pick<SeedCard, "imagePrompt">): string {
  return createHash("sha256").update(buildPrompt(card)).digest("hex").slice(0, 8);
}

/**
 * Filename stem under seed/review/. Editing a card's imagePrompt changes the hash,
 * so `--sync` finds no matching file and regenerates instead of republishing an
 * image that was reviewed against a prompt that no longer exists.
 */
export function reviewKey(
  themeName: string,
  card: Pick<SeedCard, "name" | "imagePrompt">,
): string {
  return `${slug(`${themeName}-${card.name}`)}-${promptHash(card)}`;
}
