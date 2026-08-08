import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { coversBank, selectUnseenFirst } from "@/features/quiz/seen-select";
import { GRAMMAR_BANKS } from "@/features/quiz/grammar-bank";
import { QUIZ_LENGTH } from "@/features/quiz/types";

const bankArb = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `q-${i}` }));

function seqRng(seq: number[]): () => number {
  let i = 0;
  return () => seq[i++ % seq.length];
}

const rngSeq = fc.array(fc.double({ min: 0, max: 1, noNaN: true }), {
  minLength: 1,
  maxLength: 40,
});

describe("seen-select (Inc25 FR20)", () => {
  it("always returns min(n, bank) distinct questions", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 60 }),
        rngSeq,
        (bankSize, seenCount, seq) => {
          const bank = bankArb(bankSize);
          const seen = bank.slice(0, Math.min(seenCount, bankSize)).map((q) => q.id);
          const got = selectUnseenFirst(bank, seen, QUIZ_LENGTH, seqRng(seq));
          expect(got).toHaveLength(Math.min(QUIZ_LENGTH, bankSize));
          expect(new Set(got.map((q) => q.id)).size).toBe(got.length);
        },
      ),
    );
  });

  it("serves only unseen questions while enough remain", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: QUIZ_LENGTH, max: 60 }),
        rngSeq,
        (bankSize, seq) => {
          const bank = bankArb(bankSize);
          // Leave at least QUIZ_LENGTH unseen.
          const seen = bank.slice(0, bankSize - QUIZ_LENGTH).map((q) => q.id);
          const got = selectUnseenFirst(bank, seen, QUIZ_LENGTH, seqRng(seq));
          for (const q of got) expect(seen).not.toContain(q.id);
        },
      ),
    );
  });

  it("when short, serves EVERY remaining unseen before any repeat", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: QUIZ_LENGTH + 1, max: 60 }),
        fc.integer({ min: 0, max: QUIZ_LENGTH - 1 }),
        rngSeq,
        (bankSize, unseenLeft, seq) => {
          const bank = bankArb(bankSize);
          const unseen = bank.slice(0, unseenLeft).map((q) => q.id);
          const seen = bank.slice(unseenLeft).map((q) => q.id);
          const got = selectUnseenFirst(bank, seen, QUIZ_LENGTH, seqRng(seq)).map((q) => q.id);
          for (const id of unseen) expect(got).toContain(id);
        },
      ),
    );
  });

  it("coversBank is true exactly at exhaustion", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.integer({ min: 0, max: 40 }), (size, k) => {
        const ids = bankArb(size).map((q) => q.id);
        const seen = ids.slice(0, Math.min(k, size));
        const remaining = ids.filter((id) => !seen.includes(id));
        expect(coversBank(ids, seen, remaining)).toBe(true);
        if (remaining.length > 1) {
          expect(coversBank(ids, seen, remaining.slice(1))).toBe(false);
        }
      }),
    );
  });

  // The end-to-end behaviour the feature promises, walked over a real bank: a
  // child answering repeatedly meets every question once before any repeat, and
  // the reset restarts the cycle rather than stranding them on "all seen".
  it("over a real bank: no repeat until the bank is exhausted, then it cycles", () => {
    for (const [topic, bank] of Object.entries(GRAMMAR_BANKS)) {
      const bankIds = bank.map((q) => q.id);
      let seen: string[] = [];
      const servedBeforeReset: string[] = [];
      let attempts = 0;

      // Play until the first reset.
      for (;;) {
        attempts++;
        const served = selectUnseenFirst(bank, seen, QUIZ_LENGTH, seqRng([0.1, 0.4, 0.7, 0.3, 0.9]));
        const ids = served.map((q) => q.id);
        const reset = coversBank(bankIds, seen, ids);
        if (reset) {
          seen = [...ids];
          break;
        }
        servedBeforeReset.push(...ids);
        seen = [...new Set([...seen, ...ids])];
        expect(attempts).toBeLessThan(50); // guard against a non-terminating cycle
      }

      // Everything served before the reset was distinct — no repeats early.
      expect(new Set(servedBeforeReset).size).toBe(servedBeforeReset.length);
      // The reset leaves exactly the five just answered, so the next quiz has
      // bank-5 unseen rather than a degenerate empty pool.
      expect(seen).toHaveLength(QUIZ_LENGTH);
      const next = selectUnseenFirst(bank, seen, QUIZ_LENGTH, seqRng([0.2, 0.5, 0.8]));
      for (const q of next) expect(seen).not.toContain(q.id);
      expect(topic).toBeTruthy();
    }
  });

  it("records the transitional freshness of each real bank (NFR7)", () => {
    // Not a guard — a witness. NFR7 accepts that at today's bank sizes replay
    // reaches repeats quickly; conjunctions and prepositions hold 14, not 16,
    // so they give TWO clean attempts rather than three.
    const clean: Record<string, number> = {};
    for (const [topic, bank] of Object.entries(GRAMMAR_BANKS)) {
      clean[topic] = Math.floor(bank.length / QUIZ_LENGTH);
    }
    expect(clean["conjunctions"]).toBe(2);
    expect(clean["prepositions"]).toBe(2);
    expect(clean["verb-tenses"]).toBe(3);
  });
});
