import type { BinderCard, ThemeSection } from "@/lib/types";

/**
 * Which card's art fronts a category tile in the picker (#107, reversed by
 * #122). PURE → property-tested.
 *
 * `Theme` is `{ id, name, sortOrder }` — it carries no art of its own, so a
 * picture-first picker has to borrow one from the category's cards. It borrows
 * the theme's **first legendary in catalog order**: the same card every time,
 * owned or not.
 *
 * ── Why not the rarest OWNED card, which is what this used to do ─────────────
 * That was a trophy, not a landmark. It showed off the best thing the child had
 * pulled there and changed as they collected — lovely as a reward, useless as a
 * map. Two failures, and both get worse as the pool grows past 16 themes, which
 * is the whole reason #106 exists:
 *
 *   - **A category the child has not started showed nothing at all.** It fell
 *     back to a neutral placeholder, so at the exact moment they most need to
 *     tell categories apart — before they own anything in one — the tile told
 *     them only its name. That is the reading-heavy interaction the picture
 *     picker was built to avoid, and a new theme lands every seed runbook, so
 *     there was permanently a blank tile and it was the newest one.
 *   - **A landmark that moves is not a landmark.** "The one with the whale"
 *     stopped meaning Animals the moment a rarer card arrived.
 *
 * ── Why a legendary, and what it costs ──────────────────────────────────────
 * #122 first decided each theme would get its own generated cover art depicting
 * a *place*. That works, and it was built and shipped for 16 themes — but it
 * charges every future theme an authored prompt, a bake-off row and a human
 * screening pick, forever. Two themes landed on `main` while that branch was
 * open (Rocks and Gems, Trees), each needing exactly that, which is what turned
 * a one-off backfill cost into a visibly recurring one.
 *
 * A legendary is free, permanently: no column, no blob, no seed field, no
 * runbook step, and it cannot drift out of sync with the theme because it IS
 * the theme's own art.
 *
 * The cost is real and was taken deliberately: this **leaks unearned art**.
 * `CardSlot` renders unowned cards as `❔` with no rarity hint (U5-Q5) precisely
 * so unearned art stays unearned, and the hub now shows every theme's best card
 * from day one. A common would nearly erase that leak — commons are 15 of 30
 * and pulled almost immediately — and was offered; legendary was chosen for the
 * art. The narrower rule survives untouched: the locked *slot* inside a category
 * still shows `❔`, so the picker reveals what a theme's best card LOOKS like
 * without revealing which slots are still missing.
 *
 * ── Total by construction ───────────────────────────────────────────────────
 * Every theme has exactly two legendaries (`RARITY_PYRAMID`, enforced by
 * `seed-schema.ts` on every seed command), so the first branch always hits for
 * real data. The fallback to catalog order is for a section assembled outside
 * that guarantee — a test fixture, a partially loaded theme — and exists so the
 * return is non-null and the tile never needs a placeholder branch at all. That
 * is what let the 🪐 fallback be deleted rather than kept as unreachable code.
 */
export function coverCard(section: ThemeSection): BinderCard | null {
  return (
    section.cards.find((c) => c.card.rarity === "legendary") ?? section.cards[0] ?? null
  );
}
