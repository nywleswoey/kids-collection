/**
 * Did `--sync` actually publish everything it was asked to? (Inc24 FR12)
 *
 * Runs in-band at the end of `--sync`, never as a separate opt-in command — moving
 * it out re-creates the silent-short-theme failure it exists to prevent.
 *
 * Disjoint from the schema, by design:
 *
 *   seed-schema.ts   before any write, every seed command  -> AUTHORING faults
 *   comparePoolShape after --sync writes                   -> PUBLISHING faults
 *
 * Because the schema guarantees the FILE holds 30 cards in a 15/8/5/2 pyramid, any
 * shortfall found here is by definition a failed insert (a card that 429'd out and
 * was skipped), not an authoring error. That is what makes the documented remedy —
 * re-run `--sync`; never prune, never reset — always the right one. A short theme
 * is not data loss: no child loses anything, only that (theme, rarity)
 * set-completion is unreachable until it is fixed.
 *
 * This module is PURE — the grouped query lives in `pool-reads.ts` so the
 * comparator stays testable without a database, per the repo's standing
 * convention.
 */
import { RARITIES, zeroRarityCount, type Rarity } from "@/lib/types";
import type { SeedFile } from "./seed-schema";
import { SEP } from "./publish-plan";

/** Published card count for one (theme, rarity). */
export interface PublishedCount {
  theme: string;
  rarity: Rarity;
  n: number;
}

/** One (theme, rarity) that did not land in full. */
export interface Shortfall {
  theme: string;
  rarity: Rarity;
  expected: number;
  found: number;
}

/**
 * Compare what was published against what the seed file asked for. Pure.
 *
 * Compared against the FILE, not against hard-coded 30/15/8/5/2 constants (D6):
 * the schema already guarantees the file holds the pyramid, so it is a correct
 * expectation, and a deliberate future change to the pyramid needs one edit rather
 * than two that can disagree.
 *
 * Returns [] when the pool is healthy. Over-publishing is not reported — a theme
 * cannot exceed its seed (`insertCardIfNew` is idempotent), and a card present in
 * the DB but absent from the file is a PRUNE decision, which is `previewPrune`'s
 * job and carries its own guard.
 */
export function comparePoolShape(
  seed: SeedFile,
  published: PublishedCount[],
): Shortfall[] {
  const actual = new Map<string, number>();
  for (const row of published) actual.set(`${row.theme}${SEP}${row.rarity}`, row.n);

  const shortfalls: Shortfall[] = [];
  for (const theme of seed.themes) {
    const expected = zeroRarityCount();
    for (const card of theme.cards) expected[card.rarity as Rarity]++;

    for (const rarity of RARITIES) {
      const found = actual.get(`${theme.name}${SEP}${rarity}`) ?? 0;
      if (found < expected[rarity]) {
        shortfalls.push({ theme: theme.name, rarity, expected: expected[rarity], found });
      }
    }
  }
  return shortfalls;
}
