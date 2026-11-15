import { describe, it, expect } from "vitest";
import { parseChildIdParam, parseActivityFilterParam } from "@/features/activity/filters";

describe("parseChildIdParam", () => {
  it("passes through a plain string", () => {
    expect(parseChildIdParam("kid-1")).toBe("kid-1");
  });

  it("falls back to All (null) for absent, empty, or repeated-key (array) values", () => {
    expect(parseChildIdParam(undefined)).toBeNull();
    expect(parseChildIdParam("")).toBeNull();
    expect(parseChildIdParam(["a", "b"])).toBeNull();
  });
});

describe("parseActivityFilterParam", () => {
  it("passes through every recognised filter, including the three ticket sources", () => {
    for (const f of ["ticket_admin", "ticket_quiz", "ticket_sacrifice", "card_received", "bonus_card", "trade"]) {
      expect(parseActivityFilterParam(f)).toBe(f);
    }
  });

  it("falls back to All (null) for absent, unknown, or repeated-key (array) values", () => {
    expect(parseActivityFilterParam(undefined)).toBeNull();
    expect(parseActivityFilterParam("")).toBeNull();
    expect(parseActivityFilterParam("not_a_real_type")).toBeNull();
    expect(parseActivityFilterParam("ticket_given")).toBeNull();
    expect(parseActivityFilterParam(["trade", "bonus_card"])).toBeNull();
  });
});
