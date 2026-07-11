import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  shouldShowAskParent,
  specialTicketTotal,
} from "@/features/pull/ticket-display";

describe("shouldShowAskParent (Inc10 FR2 / B1=A)", () => {
  it("shows only when every ticket type is zero", () => {
    expect(shouldShowAskParent(0, 0, 0)).toBe(true);
    expect(shouldShowAskParent(1, 0, 0)).toBe(false);
    expect(shouldShowAskParent(0, 1, 0)).toBe(false);
    expect(shouldShowAskParent(0, 0, 1)).toBe(false);
  });

  it("is hidden whenever the child holds ANY ticket", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 50 }),
        fc.nat({ max: 50 }),
        fc.nat({ max: 50 }),
        (balance, epic, lucky) => {
          const anyTicket = balance > 0 || epic > 0 || lucky > 0;
          expect(shouldShowAskParent(balance, epic, lucky)).toBe(!anyTicket);
        },
      ),
    );
  });
});

describe("specialTicketTotal (Inc10 FR1 / A1=C)", () => {
  it("sums epic + lucky and clamps negatives to 0", () => {
    expect(specialTicketTotal(2, 1)).toBe(3);
    expect(specialTicketTotal(0, 0)).toBe(0);
    expect(specialTicketTotal(-5, 3)).toBe(3);
  });

  it("equals epic + lucky for non-negative inputs", () => {
    fc.assert(
      fc.property(fc.nat({ max: 999 }), fc.nat({ max: 999 }), (e, l) => {
        expect(specialTicketTotal(e, l)).toBe(e + l);
      }),
    );
  });
});
