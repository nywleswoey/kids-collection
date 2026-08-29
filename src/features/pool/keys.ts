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
import type { Subject } from "./prompt";

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
 * Pathname for a theme's cover object (#122). Its own namespace — `uploadImage`
 * prefixes `covers/`, not `cards/`.
 *
 * A cover is NOT filed as `blobKey(theme, "Cover")` under `cards/`, even though
 * the slug would read the same. Card names are unique across the whole pool and
 * nothing stops a future theme shipping a card called "Cover", which would then
 * publish over a theme's cover with no error at either end — one object, two
 * owners. A separate prefix makes that collision unrepresentable rather than
 * unlikely.
 *
 * This is a NEW namespace, not a change to an existing one, so it is
 * independent of #91's open question about what the ~390 `cards/` URLs are
 * actually named under the store's version-9 random-suffix default.
 */
export function coverBlobKey(themeName: string): string {
  return slug(themeName);
}

/**
 * First 8 hex chars of sha256 over the prompt actually sent to the image service.
 *
 * Hashes the FULL prompt, not the authored fragment (D4): the style constant is
 * appended before it gets here, so changing `ART_STYLE` — or `COVER_STYLE` —
 * changes what every affected subject renders as. Hashing the raw authored
 * prompt would leave that change invisible to the review gate, the exact failure
 * mode FR7 exists to remove. The cost is that a style edit invalidates every
 * review file and forces a full re-review, which is the correct consequence.
 *
 * It takes the built string rather than a card (#122). It used to call
 * `buildPrompt` itself, which hard-wired "the card style" into the hash and left
 * a theme cover — which needs `COVER_STYLE` — with no way through this function
 * except a style parameter threaded down four signatures. `Subject` decides the
 * style once, at construction. Card hashes are unchanged: the same string is
 * still what gets hashed, which `keys.test.ts` pins by value.
 */
export function promptHash(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 8);
}

/**
 * Filename stem under seed/review/. Editing a card's imagePrompt changes the hash,
 * so `--sync` finds no matching file and regenerates instead of republishing an
 * image that was reviewed against a prompt that no longer exists.
 *
 * `providerSegment` (#67) is `<provider-id>-<paramHash4>`, built by
 * `providers/provider.ts`. It is a SEPARATE segment rather than another input to
 * `promptHash`, and that distinction is load-bearing twice over:
 *
 *   - Staleness is still impossible. A provider switch, or a drifted adapter
 *     parameter, changes this stem, so `--sync` finds no file and FR9 refuses
 *     the insert. Same mechanism D4 uses for ART_STYLE, one segment along.
 *   - The bake-off can still be read. #63 turned review into a subject x
 *     provider grid, and a grid needs a key that groups a row. Folding the
 *     provider into `promptHash` would give the same prompt a different hash per
 *     provider, so nothing on disk would show that three candidates answer one
 *     prompt.
 *
 * The segment is REQUIRED rather than optional-with-a-default. An optional one
 * would let a caller silently produce the pre-#67 name — a filename that matches
 * whatever provider drew it, which is the precise staleness this exists to make
 * impossible.
 */
export function reviewKey(
  themeName: string,
  subject: Subject,
  providerSegment: string,
): string {
  return `${slug(`${themeName}-${subject.name}`)}-${promptHash(subject.prompt)}-${providerSegment}`;
}
