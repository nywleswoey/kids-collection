import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { sgtDayKey, decideAward } from "@/features/quiz/cap";
import { DAILY_TICKET_CAP } from "@/features/quiz/types";

const DAY_MS = 86_400_000;

describe("sgtDayKey (Inc11 FR7)", () => {
  it("is constant within an SGT day and increments across the boundary", () => {
    // SGT midnight = 16:00 UTC previous day. Pick a known SGT midnight.
    const sgtMidnightUtc = Date.UTC(2026, 0, 1, 16, 0, 0); // 2026-01-02 00:00 SGT
    const k = sgtDayKey(sgtMidnightUtc);
    expect(sgtDayKey(sgtMidnightUtc + 1000)).toBe(k);
    expect(sgtDayKey(sgtMidnightUtc + DAY_MS - 1)).toBe(k);
    expect(sgtDayKey(sgtMidnightUtc - 1)).toBe(k - 1);
    expect(sgtDayKey(sgtMidnightUtc + DAY_MS)).toBe(k + 1);
  });

  it("is monotonic non-decreasing in time", () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (a, d) => {
        expect(sgtDayKey(a + d)).toBeGreaterThanOrEqual(sgtDayKey(a));
      }),
    );
  });
});

describe("decideAward (Inc11 FR7)", () => {
  it("never awards a failed attempt", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10 }), fc.boolean(), (g, td) => {
        expect(decideAward(false, g, td).award).toBe(false);
      }),
    );
  });

  it("awards a pass only under both caps, once per topic/day", () => {
    fc.assert(
      fc.property(fc.nat({ max: 10 }), fc.boolean(), (globalCount, topicDone) => {
        const { award, reason } = decideAward(true, globalCount, topicDone);
        if (topicDone) {
          expect(award).toBe(false);
          expect(reason).toBe("topic-done");
        } else if (globalCount >= DAILY_TICKET_CAP) {
          expect(award).toBe(false);
          expect(reason).toBe("daily-cap");
        } else {
          expect(award).toBe(true);
          expect(reason).toBe("ok");
        }
      }),
    );
  });
});
