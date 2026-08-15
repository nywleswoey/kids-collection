import type { SeedCard } from "./seed-schema";

/**
 * Kid-friendly art style appended to every image prompt (U3-BR5).
 *
 * ── Why this no longer says "trading-card" (#81) ─────────────────────────────
 * It used to read "cartoon TRADING-CARD illustration". That phrase describes the
 * artefact the picture ends up inside, not the picture — and `cloudflare-sdxl`
 * drew the artefact: a wooden picture frame, a tan mat with a gold rule, a
 * rounded green panel, with the card's actual subject inset within it. The
 * binder renders every card at a fixed size, so a framed card is inset relative
 * to an unframed one and a theme drawn from mixed lanes stops looking uniform.
 *
 * Measured on 20 paired samples (4 subjects x 5 seeds), by eye and by a border
 * detector that agreed with it:
 *
 *   this style, with "trading-card"        7 / 20 framed
 *   + `negative_prompt` on the adapter     5 / 20   — no effect
 *   + "full-bleed edge-to-edge, no border" 6 / 20   — no effect
 *   without "trading-card"                 1 / 20   — and that one is a flat
 *                                                     colour margin, not a frame
 *
 * Two things that did NOT work are worth as much as the one that did, because
 * both are the obvious next idea:
 *
 *   - Naming the border in order to forbid it makes no difference. SDXL weights
 *     the noun and drops the negation, so "no border" is a border cue. The fix
 *     is to stop mentioning the object at all, not to argue with it.
 *   - `negative_prompt` on the Cloudflare adapter is no better than saying
 *     nothing, so no such param exists. That is deliberate: `params` is hashed
 *     into every review filename (`providers/provider.ts`), and a parameter that
 *     buys nothing would invalidate a folder of reviewed images for free.
 *
 * The seed is NOT the lever either. #66 and #74 found this lane non-deterministic
 * despite `seed: 42` being pinned, and #81 confirms it: the same request framed
 * on one run and not on the next. Frames varied freely across five seeds in both
 * arms, so there is no lucky seed to pick.
 *
 * ── What this costs, and why it is affordable ────────────────────────────────
 * `promptHash` (keys.ts, D4) covers this string, so editing it invalidates every
 * review file — by design, and the reason the change lands as one edit rather
 * than drifting in. It does NOT touch the ~360 published cards: `planInserts`
 * only ever plans cards absent from the database, so a published card is never
 * re-generated and never re-audited. The map rules re-rendering them out of
 * scope, and this respects that.
 *
 * Nor does it shift the incumbent lane's look, which is the thing the binder's
 * coherence actually rests on. Pollinations serves `sana` (#64), and #81 drew
 * all four subjects through both styles there: same painterly semi-realism, same
 * compositions, same failure modes. `sana` never drew the frame and never read
 * the phrase. Every one of the ~360 published cards came from that lane, so the
 * cards this change alters are the ones that were diverging anyway.
 */
export const ART_STYLE =
  "vibrant kid-friendly cartoon illustration, bright colors, " +
  "friendly, clean background, no text";

/** Build the full Pollinations prompt for a card (pure). */
export function buildPrompt(card: Pick<SeedCard, "imagePrompt">): string {
  return `${card.imagePrompt}, ${ART_STYLE}`;
}
