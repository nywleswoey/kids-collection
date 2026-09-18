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
 * THE NUMBERS BELOW ARE THE CANONICAL ONES. Everywhere else that mentions this —
 * the Cloudflare adapter, `NEW-THEME-RUNBOOK.md`, the guard in `pool.test.ts` —
 * points here rather than restating them, so re-measuring is one edit.
 * `pnpm prototype:81` regenerates the images and the contact sheet they were
 * judged from; the detector column is a one-off cross-check that is NOT in the
 * repo, for the reason that prototype's header gives.
 *
 * Measured on paired samples, 4 subjects x 5 seeds per arm, seed-paired so each
 * treated sample has its own control. Two instruments, because a frame is
 * invisible to every automated check the seam has and eyeballing is therefore
 * the only native one; and the whole run was repeated, because this lane is not
 * deterministic and one run of 20 is thin:
 *
 *                                          by eye    detector
 *                                          (1 run)   (2 runs)
 *   this style, with "trading-card"        11 / 20    13 / 40
 *   + `negative_prompt` on the adapter      8 / 20     7 / 40
 *   + "full-bleed edge-to-edge, no border" 10 / 20    10 / 40
 *   without "trading-card"                  1 / 20     2 / 40
 *
 * The instruments disagree on the RATE and agree on the RANKING. The detector
 * reads a flat uniform band along all four edges, so it misses ornate frames
 * whose borders carry too much detail to be flat — it under-reads every arm,
 * and the by-eye column is the one to quote for severity: this was a *majority*
 * of candidates, not a third.
 *
 * Two things that did not fix it are worth as much as the one that did, because
 * both are the obvious next idea:
 *
 *   - Naming the border in order to forbid it does nothing at all. SDXL weights
 *     the noun and drops the negation, so "no border" is a border cue. The fix
 *     is to stop mentioning the object, not to argue with it.
 *   - `negative_prompt` on the Cloudflare adapter is NOT inert — it roughly
 *     halves the rate, and a first run of 20 was too thin to see that. It is
 *     still not the fix: it leaves frames on a sixth of candidates where
 *     deleting two words leaves them on a twentieth, and it does not address
 *     the cause. And it is not free — `params` is hashed into every review
 *     filename (`providers/provider.ts`), so adding one invalidates a folder of
 *     reviewed images. A partial fix at that price, stacked on top of the real
 *     one, is why no such param exists.
 *
 * The seed is NOT the lever either. #66 and #74 found this lane non-deterministic
 * despite `seed: 42` being pinned, and #81 confirms it: the same request framed
 * on one run and not on the next. Frames varied freely across five seeds in both
 * arms, so there is no lucky seed to pick. `guidance`, `num_steps` and the
 * checkpoint were left alone once the cause turned out to sit upstream of all
 * three, in this string; they are where to look if anyone ever chases the
 * residual 1-in-20.
 *
 * ── Why "no text" survives the same argument ────────────────────────────────
 * It is the identical shape to "no border", which the table above shows is a
 * cue rather than a prohibition — so it was measured too, the same way: 20
 * samples with the phrase, 20 without. Text appeared once with it and never
 * without, which at this sample size is no detectable effect either way, so it
 * stays rather than churn `promptHash` for a change nothing can see.
 *
 * The asymmetry with "trading-card" is the real lesson, and it is about the
 * NOUN rather than the negation: a trading card is an object a diffusion model
 * has abundant training data for and can draw, so naming it — in any polarity —
 * puts it in the picture. "Text" is not a thing it can draw a picture OF.
 * Suspect any phrase here that names something depictable; a phrase that names
 * a property is comparatively safe.
 *
 * ── What this costs, and why it is affordable ────────────────────────────────
 * `promptHash` (keys.ts, D4) covers this string, so editing it invalidates every
 * review file — by design, and the reason the change lands as one edit rather
 * than drifting in. It does NOT touch the ~360 published cards: `planInserts`
 * only ever plans cards absent from the database, so a published card is never
 * re-generated and never re-audited. The map rules re-rendering them out of
 * scope, and this respects that.
 *
 * Nor does it shift the incumbent lane's look. Pollinations serves `sana` (#64),
 * and #81 drew all four subjects through both styles there: same painterly
 * semi-realism, same compositions, same failure modes. `sana` never drew the
 * frame and never read the phrase, and every one of the ~360 published cards
 * came from that lane — so this edit does not move the art that is already in
 * the binder.
 *
 * That is a MEASUREMENT, not the coherence verdict. Whether mixing providers
 * breaks the binder is #77's question and stays open there; all this establishes
 * is that #81's fix is not one of the things that could break it.
 */
export const ART_STYLE =
  "vibrant kid-friendly cartoon illustration, bright colors, " +
  "friendly, clean background, no text";

/**
 * Build the full prompt for a card (pure).
 *
 * Every provider gets the same string — the seam varies the adapter, never the
 * words (#67) — which is what lets the contact sheet group a subject's
 * candidates into one row, and what makes this constant a shared surface rather
 * than one lane's tuning knob.
 */
export function buildPrompt(card: Pick<SeedCard, "imagePrompt">): string {
  return `${card.imagePrompt}, ${ART_STYLE}`;
}
