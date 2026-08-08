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

    // Inc25 FR19 — seen-question tracking. Both adapters must agree, including
    // on the reset, which is the half a fake most easily gets wrong.
    const sorted = async (s: QuizStore, child: string, topic: string) =>
      (await s.seenQuestionIds(child, topic)).sort();

    it("markQuestionsSeen round-trips through seenQuestionIds", async () => {
      const store = await makeStore();
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-1", "vt-2"],
        reset: false,
      });
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-1", "vt-2"]);
    });

    it("seen-sets are scoped by child AND by topic", async () => {
      const store = await makeStore();
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-1"],
        reset: false,
      });
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "prepositions",
        questionIds: ["pr-1"],
        reset: false,
      });
      await store.markQuestionsSeen({
        childId: "other",
        topic: "verb-tenses",
        questionIds: ["vt-9"],
        reset: false,
      });
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-1"]);
      expect(await sorted(store, "kid", "prepositions")).toEqual(["pr-1"]);
      expect(await sorted(store, "other", "verb-tenses")).toEqual(["vt-9"]);
    });

    it("re-recording the same ids is a no-op (a replayed submission cannot double-write)", async () => {
      const store = await makeStore();
      const entry = {
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-1", "vt-2"],
        reset: false,
      };
      await store.markQuestionsSeen(entry);
      await store.markQuestionsSeen(entry);
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-1", "vt-2"]);
    });

    it("without reset, ids accumulate across attempts", async () => {
      const store = await makeStore();
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-1", "vt-2"],
        reset: false,
      });
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-2", "vt-3"],
        reset: false,
      });
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-1", "vt-2", "vt-3"]);
    });

    it("reset clears ONLY that (child, topic) and leaves the newly served ids", async () => {
      const store = await makeStore();
      for (const [childId, topic, ids] of [
        ["kid", "verb-tenses", ["vt-1", "vt-2"]],
        ["kid", "prepositions", ["pr-1"]],
        ["other", "verb-tenses", ["vt-5"]],
      ] as const) {
        await store.markQuestionsSeen({ childId, topic, questionIds: [...ids], reset: false });
      }

      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-7", "vt-8"],
        reset: true,
      });

      // The cycle restarts from exactly the questions just answered…
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-7", "vt-8"]);
      // …and nothing else is touched.
      expect(await sorted(store, "kid", "prepositions")).toEqual(["pr-1"]);
      expect(await sorted(store, "other", "verb-tenses")).toEqual(["vt-5"]);
    });

    it("an empty id list writes nothing", async () => {
      const store = await makeStore();
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: ["vt-1"],
        reset: false,
      });
      await store.markQuestionsSeen({
        childId: "kid",
        topic: "verb-tenses",
        questionIds: [],
        reset: true,
      });
      // Nothing recorded, and crucially the reset did NOT fire — an abandoned or
      // pre-deploy submission must not wipe a child's progress.
      expect(await sorted(store, "kid", "verb-tenses")).toEqual(["vt-1"]);
    });

    it("an unknown (child, topic) reads as empty", async () => {
      const store = await makeStore();
      expect(await store.seenQuestionIds("nobody", "verb-tenses")).toEqual([]);
    });
  });
}
