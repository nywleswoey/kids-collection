import type { QuizCompletionRow } from "@/db/schema";
import type { QuizStore } from "./quiz-store";

/** Lighter seed than a full row — id defaults, unset fields default to 0/false. */
export interface QuizSeedRow {
  childId: string;
  topic: string;
  awarded: boolean;
  createdAt: Date;
  passed?: boolean;
  correct?: number;
  total?: number;
}

/**
 * In-memory QuizStore. `recentCompletions` orders newest-first (ties broken by
 * insertion order, matching a monotonic createdAt). Recorded attempts stamp a
 * fresh id + createdAt. Kept honest by the shared contract suite.
 */
export function inMemoryQuizStore(seed: QuizSeedRow[] = []): QuizStore {
  let seq = 0;
  const rows: Array<QuizCompletionRow & { seq: number }> = seed.map((r) => ({
    id: `q${++seq}`,
    childId: r.childId,
    topic: r.topic,
    correct: r.correct ?? 0,
    total: r.total ?? 0,
    passed: r.passed ?? false,
    awarded: r.awarded,
    createdAt: r.createdAt,
    seq,
  }));

  const strip = (r: QuizCompletionRow & { seq: number }): QuizCompletionRow => {
    const { seq: _seq, ...row } = r;
    return row;
  };

  return {
    async completionsFor(childId) {
      return rows.filter((r) => r.childId === childId).map(strip);
    },

    async recentCompletions(childId, limit) {
      return rows
        .filter((r) => r.childId === childId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.seq - a.seq)
        .slice(0, limit)
        .map(strip);
    },

    async recordCompletion(entry) {
      seq += 1;
      rows.push({ id: `q${seq}`, createdAt: new Date(), seq, ...entry });
    },
  };
}
