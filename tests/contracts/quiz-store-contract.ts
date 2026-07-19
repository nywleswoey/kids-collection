import { describe, it, expect } from "vitest";
import type { QuizStore } from "@/db/stores/quiz-store";
import type { QuizSeedRow } from "@/db/stores/quiz-store.fake";

/**
 * Shared QuizStore conformance spec — run against BOTH the in-memory fake and the
 * pg adapter. `makeStore(seed)` must return a FRESH, isolated store; seeded rows
 * carry explicit createdAt so ordering is deterministic.
 */
export function runQuizStoreContract(
  label: string,
  makeStore: (seed?: QuizSeedRow[]) => QuizStore | Promise<QuizStore>,
) {
  const d = (iso: string) => new Date(iso);

  describe(`QuizStore contract: ${label}`, () => {
    it("recordCompletion is readable via completionsFor, scoped by child", async () => {
      const store = await makeStore();
      await store.recordCompletion({
        childId: "kid",
        topic: "t",
        correct: 5,
        total: 5,
        passed: true,
        awarded: true,
      });
      const rows = await store.completionsFor("kid");
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ childId: "kid", topic: "t", correct: 5, awarded: true });
      expect(await store.completionsFor("other")).toEqual([]);
    });

    it("completionsFor returns every row for the child", async () => {
      const store = await makeStore([
        { childId: "kid", topic: "a", awarded: true, createdAt: d("2026-01-01T00:00:00Z") },
        { childId: "kid", topic: "b", awarded: false, createdAt: d("2026-01-02T00:00:00Z") },
        { childId: "other", topic: "a", awarded: true, createdAt: d("2026-01-01T00:00:00Z") },
      ]);
      expect(await store.completionsFor("kid")).toHaveLength(2);
    });

    it("recentCompletions returns newest-first, limited", async () => {
      const store = await makeStore([
        { childId: "kid", topic: "old", awarded: false, createdAt: d("2026-01-01T00:00:00Z") },
        { childId: "kid", topic: "mid", awarded: false, createdAt: d("2026-01-02T00:00:00Z") },
        { childId: "kid", topic: "new", awarded: false, createdAt: d("2026-01-03T00:00:00Z") },
      ]);
      const rows = await store.recentCompletions("kid", 2);
      expect(rows.map((r) => r.topic)).toEqual(["new", "mid"]);
    });
  });
}
