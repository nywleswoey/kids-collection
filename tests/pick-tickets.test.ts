import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { pickRarityChoices } from "@/features/pull/easter-egg";
import {
  pickTicketColumn,
  pickTicketsFromRow,
  hasAnyPickTicket,
} from "@/features/pull/pick-tickets";
import { RARITIES, type Rarity } from "@/lib/types";
import type { Card } from "@/lib/types";

function card(id: string, rarity: Rarity): Card {
  return { id, themeId: "t", name: id, rarity, imageUrl: "x", eduText: "y", sourceUrl: "" };
}

describe("pickRarityChoices (Inc16 FR2)", () => {
  it("returns up to n cards, all of the exact rarity", () => {
    const pool = [
      card("a", "rare"),
      card("b", "rare"),
      card("c", "epic"),
      card("d", "rare"),
      card("e", "common"),
      card("f", "rare"),
      card("g", "rare"),
    ];
    fc.assert(
      fc.property(fc.constantFrom<Rarity>(...RARITIES), (rarity) => {
        const out = pickRarityChoices(pool, rarity, 5);
        expect(out.length).toBeLessThanOrEqual(5);
        expect(out.every((c) => c.rarity === rarity)).toBe(true);
        // no more than the pool has of that rarity
        const avail = pool.filter((c) => c.rarity === rarity).length;
        expect(out.length).toBe(Math.min(5, avail));
      }),
    );
  });
});

describe("pick-tickets helpers (Inc16 FR2/FR3)", () => {
  it("column name per rarity", () => {
    expect(pickTicketColumn("common")).toBe("commonPickTickets");
    expect(pickTicketColumn("rare")).toBe("rarePickTickets");
    expect(pickTicketColumn("epic")).toBe("epicPickTickets");
    expect(pickTicketColumn("legendary")).toBe("legendaryPickTickets");
  });

  it("maps a row to a Record and detects any ticket", () => {
    const row = {
      commonPickTickets: 0,
      rarePickTickets: 2,
      epicPickTickets: 0,
      legendaryPickTickets: 0,
    };
    const rec = pickTicketsFromRow(row);
    expect(rec).toEqual({ common: 0, rare: 2, epic: 0, legendary: 0 });
    expect(hasAnyPickTicket(rec)).toBe(true);
    expect(hasAnyPickTicket({ common: 0, rare: 0, epic: 0, legendary: 0 })).toBe(false);
  });
});
