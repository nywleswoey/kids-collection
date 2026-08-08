/**
 * Unseen-first question selection and the exhaustion cycle (Inc25 FR20).
 *
 * Pure — no store, no DOM — so the two decisions that make the anti-memorisation
 * fix work are property-testable on their own, and `quiz-service` stays
 * orchestration.
 */

import type { Rng } from "@/lib/logic";
import { sample } from "@/lib/rng";

/**
 * Pick `n` questions, preferring ones the child has not answered.
 *
 * While enough unseen remain, only unseen are served. When fewer than `n` are
 * left, ALL of them are served and the rest is filled from the seen pile — so a
 * child always meets every remaining new question before any repeat comes back.
 *
 * `sample` supplies the distinctness guarantee, so it is not re-implemented.
 */
export function selectUnseenFirst<T extends { id: string }>(
  bank: readonly T[],
  seenIds: readonly string[],
  n: number,
  rng: Rng,
): T[] {
  const seen = new Set(seenIds);
  const unseen = bank.filter((q) => !seen.has(q.id));
  if (unseen.length >= n) return sample(unseen, n, rng);

  // Bank about to be exhausted: everything still unseen, topped up from the rest.
  const rest = bank.filter((q) => seen.has(q.id));
  return [...sample(unseen, unseen.length, rng), ...sample(rest, n - unseen.length, rng)];
}

/**
 * Would recording `servedIds` leave every question in the bank seen?
 *
 * True means the cycle should restart: the caller clears the topic's seen-set
 * and records only the questions just served, so the next quiz has `bank - n`
 * unseen to draw from rather than a degenerate "everything is seen" state.
 */
export function coversBank(
  bankIds: readonly string[],
  seenIds: readonly string[],
  servedIds: readonly string[],
): boolean {
  const after = new Set([...seenIds, ...servedIds]);
  return bankIds.every((id) => after.has(id));
}
