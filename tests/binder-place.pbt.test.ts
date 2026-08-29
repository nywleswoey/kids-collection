import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  BURN,
  BURN_PARAM,
  HUB,
  backHref,
  cardHref,
  parsePlace,
  placeHref,
  placeParam,
  type Place,
} from "@/features/binder/binder-place";
import type { ThemeSection } from "@/lib/types";

function section(id: string): ThemeSection {
  return {
    theme: { id, name: id },
    cards: [],
    progress: { owned: 0, total: 0, complete: false },
  };
}

/** Theme ids are `gen_random_uuid()`, so never the reserved `burn`. */
const themeIdArb = fc.uuid();
const sectionsArb = fc
  .uniqueArray(themeIdArb, { maxLength: 8 })
  .map((ids) => ids.map(section));

const placeArb: fc.Arbitrary<Place> = fc.oneof(
  fc.constant(HUB),
  fc.constant(BURN),
  themeIdArb.map((themeId) => ({ kind: "category", themeId }) as Place),
);

describe("parsePlace (#108 one place, in the URL)", () => {
  it("absent, empty and unknown all mean the hub", () => {
    const sections = [section("a"), section("b")];
    expect(parsePlace(undefined, sections)).toEqual(HUB);
    expect(parsePlace("", sections)).toEqual(HUB);
    expect(parsePlace("deleted-theme", sections)).toEqual(HUB);
  });

  it("never errors and never yields a category that does not exist", () => {
    fc.assert(
      fc.property(fc.string(), sectionsArb, (at, sections) => {
        const place = parsePlace(at, sections);
        if (place.kind === "category") {
          expect(sections.some((s) => s.theme.id === place.themeId)).toBe(true);
        }
      }),
    );
  });

  it("reads the burn pile whatever the catalog holds", () => {
    fc.assert(
      fc.property(sectionsArb, (sections) => {
        expect(parsePlace(BURN_PARAM, sections)).toEqual(BURN);
      }),
    );
  });

  it("takes the first value when a param is repeated", () => {
    const sections = [section("a"), section("b")];
    expect(parsePlace(["a", "b"], sections)).toEqual({ kind: "category", themeId: "a" });
  });

  it("round-trips every place that exists", () => {
    fc.assert(
      fc.property(placeArb, (place) => {
        const sections = place.kind === "category" ? [section(place.themeId)] : [];
        expect(parsePlace(placeParam(place) ?? undefined, sections)).toEqual(place);
      }),
    );
  });
});

describe("placeHref", () => {
  it("gives the hub the bare route, not an empty parameter", () => {
    expect(placeHref(HUB)).toBe("/play/binder");
  });

  it("names the other two places", () => {
    expect(placeHref(BURN)).toBe("/play/binder?at=burn");
    expect(placeHref({ kind: "category", themeId: "abc" })).toBe("/play/binder?at=abc");
  });
});

describe("cardHref", () => {
  it("carries the place the card was tapped from", () => {
    expect(cardHref("c1", BURN)).toBe("/play/binder/c1?from=burn");
    expect(cardHref("c1", { kind: "category", themeId: "t1" })).toBe(
      "/play/binder/c1?from=t1",
    );
  });

  it("omits ?from at the hub", () => {
    expect(cardHref("c1", HUB)).toBe("/play/binder/c1");
  });

  it("always points at the card, whatever the origin", () => {
    fc.assert(
      fc.property(fc.uuid(), placeArb, (cardId, from) => {
        expect(cardHref(cardId, from).startsWith(`/play/binder/${cardId}`)).toBe(true);
      }),
    );
  });
});

describe("backHref (#108 the round trip)", () => {
  it("returns to the burn pile, which is a loop", () => {
    expect(backHref("burn", "t1")).toBe("/play/binder?at=burn");
  });

  it("returns to the category the card was tapped in", () => {
    expect(backHref("t1", "t1")).toBe("/play/binder?at=t1");
  });

  it("falls back to the card's own category when nothing was carried", () => {
    expect(backHref(undefined, "t9")).toBe("/play/binder?at=t9");
    expect(backHref("", "t9")).toBe("/play/binder?at=t9");
  });

  it("never lands the child off the binder, whatever ?from says", () => {
    fc.assert(
      fc.property(fc.option(fc.string(), { nil: undefined }), fc.uuid(), (from, themeId) => {
        expect(backHref(from, themeId).startsWith("/play/binder?at=")).toBe(true);
      }),
    );
  });

  it("a junk ?from degrades to the hub one hop later rather than erroring", () => {
    fc.assert(
      fc.property(fc.string(), sectionsArb, (junk, sections) => {
        const href = backHref(junk, "not-a-theme");
        const at = decodeURIComponent(href.slice("/play/binder?at=".length));
        expect(() => parsePlace(at, sections)).not.toThrow();
      }),
    );
  });
});
