import { describe, it, expect } from "vitest";
import { parseChildIdParam, parseEventTypeParam } from "@/features/activity/filters";

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

describe("parseEventTypeParam", () => {
  it("passes through a recognised event type", () => {
    expect(parseEventTypeParam("trade")).toBe("trade");
    expect(parseEventTypeParam("bonus_card")).toBe("bonus_card");
  });

  it("falls back to All (null) for absent, unknown, or repeated-key (array) values", () => {
    expect(parseEventTypeParam(undefined)).toBeNull();
    expect(parseEventTypeParam("")).toBeNull();
    expect(parseEventTypeParam("not_a_real_type")).toBeNull();
    expect(parseEventTypeParam(["trade", "bonus_card"])).toBeNull();
  });
});
