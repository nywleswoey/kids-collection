import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  FRANCHISE_PROVIDERS,
  franchiseByKey,
  franchiseKey,
  franchiseKeyFromThemeId,
  franchiseKeysIn,
  franchisePlaceForTheme,
  franchiseProgress,
  franchiseSection,
  groupFranchises,
  groupedHubSections,
  hubTarget,
  isFranchiseGroup,
} from "@/features/binder/franchise";
import { coverCard } from "@/features/binder/category-cover";
import type { BinderCard, Rarity, Theme, ThemeSection } from "@/lib/types";

const POKEMON_PROVIDER = "pokeapi-official-artwork";

function theme(id: string, provider: string | null = null): Theme {
  return { id, name: id, provider };
}

function section(
  id: string,
  opts: {
    provider?: string | null;
    owned?: number;
    total?: number;
    complete?: boolean;
    cards?: BinderCard[];
  } = {},
): ThemeSection {
  const owned = opts.owned ?? 0;
  const total = opts.total ?? 1;
  return {
    theme: theme(id, opts.provider ?? null),
    cards: opts.cards ?? [],
    progress: { owned, total, complete: opts.complete ?? (total > 0 && owned === total) },
  };
}

function sectionsFromTags(tags: boolean[]): ThemeSection[] {
  return tags.map((isPokemon, i) =>
    section(`t${i}`, { provider: isPokemon ? POKEMON_PROVIDER : null }),
  );
}

const tagsArb = fc.array(fc.boolean(), { maxLength: 10 });

describe("FRANCHISE_PROVIDERS", () => {
  it("maps the Pokémon escape-hatch provider to the 'Pokémon' label", () => {
    expect(FRANCHISE_PROVIDERS["pokeapi-official-artwork"]).toBe("Pokémon");
  });
});

describe("franchiseKey", () => {
  it("slugifies 'Pokémon' without its accent", () => {
    expect(franchiseKey("Pokémon")).toBe("pokemon");
  });
});

describe("groupFranchises (#140's revisit)", () => {
  it("collapses every Pokémon theme into one group, leaving other themes flat", () => {
    const sections = [
      section("animals"),
      section("kanto", { provider: POKEMON_PROVIDER }),
      section("superheroes"),
      section("johto", { provider: POKEMON_PROVIDER }),
    ];
    const grouped = groupFranchises(sections);

    expect(grouped).toHaveLength(3); // animals, [kanto+johto], superheroes
    expect(isFranchiseGroup(grouped[0]!)).toBe(false);
    expect(isFranchiseGroup(grouped[1]!)).toBe(true);
    expect(isFranchiseGroup(grouped[2]!)).toBe(false);
    const group = grouped[1];
    if (isFranchiseGroup(group)) {
      expect(group.key).toBe("pokemon");
      expect(group.label).toBe("Pokémon");
      expect(group.members.map((m) => m.theme.id)).toEqual(["kanto", "johto"]);
    }
  });

  it("is total by construction: every section appears in exactly one tile", () => {
    fc.assert(
      fc.property(tagsArb, (tags) => {
        const sections = sectionsFromTags(tags);
        const grouped = groupFranchises(sections);
        const allMembers = grouped.flatMap((e) => (isFranchiseGroup(e) ? e.members : [e]));
        expect(allMembers.map((s) => s.theme.id).sort()).toEqual(
          sections.map((s) => s.theme.id).sort(),
        );
      }),
    );
  });

  it("positions the franchise group at its oldest member's original slot", () => {
    fc.assert(
      fc.property(tagsArb, (tags) => {
        const sections = sectionsFromTags(tags);
        const firstPokemonIdx = sections.findIndex((s) => s.theme.provider === POKEMON_PROVIDER);
        if (firstPokemonIdx === -1) return;
        const nonPokemonBefore = sections
          .slice(0, firstPokemonIdx)
          .filter((s) => s.theme.provider !== POKEMON_PROVIDER).length;
        const groupIdx = groupFranchises(sections).findIndex(isFranchiseGroup);
        expect(groupIdx).toBe(nonPokemonBefore);
      }),
    );
  });

  it("does not move once placed, even as more regions are appended behind it", () => {
    fc.assert(
      fc.property(tagsArb, fc.integer({ min: 0, max: 5 }), (tags, extraCount) => {
        const sections = sectionsFromTags(tags);
        if (!sections.some((s) => s.theme.provider === POKEMON_PROVIDER)) return;
        const before = groupFranchises(sections).findIndex(isFranchiseGroup);

        const extra = Array.from({ length: extraCount }, (_, i) =>
          section(`extra${i}`, { provider: POKEMON_PROVIDER }),
        );
        const after = groupFranchises([...sections, ...extra]).findIndex(isFranchiseGroup);
        expect(after).toBe(before);
      }),
    );
  });
});

describe("franchiseProgress (aggregate + set-complete count)", () => {
  it("sums card progress across members and counts complete sets", () => {
    const members = [
      section("kanto", { owned: 30, total: 30, complete: true }),
      section("johto", { owned: 10, total: 30, complete: false }),
      section("hoenn", { owned: 30, total: 30, complete: true }),
    ];
    expect(franchiseProgress(members)).toEqual({
      owned: 70,
      total: 90,
      complete: false,
      completeSets: 2,
      totalSets: 3,
    });
  });

  it("is complete only when every member set is complete", () => {
    const allComplete = [
      section("kanto", { owned: 30, total: 30, complete: true }),
      section("johto", { owned: 30, total: 30, complete: true }),
    ];
    expect(franchiseProgress(allComplete).complete).toBe(true);

    const oneShort = [
      section("kanto", { owned: 30, total: 30, complete: true }),
      section("johto", { owned: 29, total: 30, complete: false }),
    ];
    expect(franchiseProgress(oneShort).complete).toBe(false);
  });
});

function bcard(id: string, rarity: Rarity, themeId: string): BinderCard {
  return {
    card: { id, themeId, name: id, rarity, imageUrl: "", eduText: "", sourceUrl: "" },
    owned: false,
    count: 0,
  };
}

describe("franchiseSection cover (coverCard's own rule, over the union of members)", () => {
  it("picks the alphabetically-first legendary across every member's cards", () => {
    const members = [
      section("kanto", {
        cards: [bcard("z-legendary", "legendary", "kanto"), bcard("common-a", "common", "kanto")],
      }),
      section("johto", { cards: [bcard("a-legendary", "legendary", "johto")] }),
    ];
    const group = { key: "pokemon", label: "Pokémon", members };
    const cover = coverCard(franchiseSection(group));
    expect(cover?.card.id).toBe("a-legendary");
  });
});

describe("hubTarget / franchiseKeyFromThemeId", () => {
  it("routes a synthetic franchise theme id to the franchise place", () => {
    expect(hubTarget("franchise:pokemon")).toEqual({ kind: "franchise", key: "pokemon" });
    expect(franchiseKeyFromThemeId("franchise:pokemon")).toBe("pokemon");
  });

  it("routes a real theme id to the category place", () => {
    expect(hubTarget("abc-123")).toEqual({ kind: "category", themeId: "abc-123" });
    expect(franchiseKeyFromThemeId("abc-123")).toBeNull();
  });
});

describe("franchiseKeysIn / franchiseByKey / franchisePlaceForTheme", () => {
  const sections = [
    section("animals"),
    section("kanto", { provider: POKEMON_PROVIDER }),
    section("johto", { provider: POKEMON_PROVIDER }),
  ];

  it("reports every franchise key present among the sections", () => {
    expect(franchiseKeysIn(sections)).toEqual(new Set(["pokemon"]));
  });

  it("resolves a franchise's own members by key", () => {
    const group = franchiseByKey(sections, "pokemon");
    expect(group?.members.map((m) => m.theme.id)).toEqual(["kanto", "johto"]);
  });

  it("returns null for a key with no members", () => {
    expect(franchiseByKey(sections, "marvel")).toBeNull();
  });

  it("gives a franchise theme's own back target, and null for a theme with none", () => {
    expect(franchisePlaceForTheme(sections[1]!.theme)).toEqual({ kind: "franchise", key: "pokemon" });
    expect(franchisePlaceForTheme(sections[0]!.theme)).toBeNull();
  });
});

describe("groupedHubSections", () => {
  it("replaces a franchise's members with one synthetic tile, same order otherwise", () => {
    const sections = [
      section("animals"),
      section("kanto", { provider: POKEMON_PROVIDER, owned: 30, total: 30, complete: true }),
      section("superheroes"),
      section("johto", { provider: POKEMON_PROVIDER, owned: 0, total: 30, complete: false }),
    ];
    const hub = groupedHubSections(sections);
    expect(hub.map((s) => s.theme.name)).toEqual(["animals", "Pokémon", "superheroes"]);
    const pokemon = hub[1]!;
    expect(pokemon.theme.id).toBe("franchise:pokemon");
    expect(pokemon.progress).toEqual({
      owned: 30,
      total: 60,
      complete: false,
      sets: { owned: 1, total: 2 },
    });
  });
});
