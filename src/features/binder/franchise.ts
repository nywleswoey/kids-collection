import type { Place } from "./binder-place";
import { orderCategoryCards } from "./card-order";
import type { BinderCard, Theme, ThemeSection } from "@/lib/types";

/**
 * Franchise grouping for the binder hub — #140's grouping tripwire (36
 * themes), revisited now that the catalog has crossed it. PURE →
 * property-tested.
 *
 * The signal is `themes.provider` (the "theme-picks" provider pin
 * cards.json already carries per Pokémon theme, promoted to a real column),
 * not a theme-name match or a free-text taxonomy field: #140 and #122 both
 * rejected authored grouping as a recurring per-theme cost, and the provider
 * pin is already an unambiguous, mechanically-enforced fact of how a theme
 * was drawn — reading it adds no new authoring step.
 */
export const FRANCHISE_PROVIDERS: Record<string, string> = {
  "pokeapi-official-artwork": "Pokémon",
};

const FRANCHISE_ID_PREFIX = "franchise:";

export function franchiseLabelForTheme(theme: Theme): string | null {
  return FRANCHISE_PROVIDERS[theme.provider ?? ""] ?? null;
}

/** Stable, URL- and testid-safe key for a franchise label: "Pokémon" -> "pokemon". */
export function franchiseKey(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface FranchiseGroup {
  key: string;
  label: string;
  members: ThemeSection[];
}

/**
 * Collapse every franchise's members into one group each, in the order
 * `sections` arrives in (oldest → newest, `listThemes`' contract) — so a
 * group's position is wherever its OLDEST member first appears, and every
 * other section keeps its own slot untouched. Total by construction: every
 * input section ends up in exactly one output entry, either standing alone
 * or inside the one group its franchise collapsed to.
 */
export function groupFranchises(
  sections: ThemeSection[],
): (ThemeSection | FranchiseGroup)[] {
  const result: (ThemeSection | FranchiseGroup)[] = [];
  const indexByKey = new Map<string, number>();
  for (const section of sections) {
    const label = franchiseLabelForTheme(section.theme);
    if (!label) {
      result.push(section);
      continue;
    }
    const key = franchiseKey(label);
    const idx = indexByKey.get(key);
    if (idx === undefined) {
      indexByKey.set(key, result.length);
      result.push({ key, label, members: [section] });
    } else {
      (result[idx] as FranchiseGroup).members.push(section);
    }
  }
  return result;
}

export function isFranchiseGroup(
  entry: ThemeSection | FranchiseGroup,
): entry is FranchiseGroup {
  return "members" in entry;
}

/** Card progress summed across a franchise's members, plus its own set-complete tally. */
export function franchiseProgress(members: ThemeSection[]): {
  owned: number;
  total: number;
  complete: boolean;
  completeSets: number;
  totalSets: number;
} {
  const owned = members.reduce((n, m) => n + m.progress.owned, 0);
  const total = members.reduce((n, m) => n + m.progress.total, 0);
  const completeSets = members.filter((m) => m.progress.complete).length;
  return {
    owned,
    total,
    complete: members.length > 0 && completeSets === members.length,
    completeSets,
    totalSets: members.length,
  };
}

/** `coverCard`'s own rule, applied over the union of every member's cards. */
export function franchiseCards(members: ThemeSection[]): BinderCard[] {
  return orderCategoryCards(members.flatMap((m) => m.cards));
}

/** The synthetic tile `CategoryPicker`/`CategoryTile` renders for a franchise group. */
export function franchiseSection(group: FranchiseGroup): ThemeSection {
  const progress = franchiseProgress(group.members);
  return {
    theme: { id: `${FRANCHISE_ID_PREFIX}${group.key}`, name: group.label },
    cards: franchiseCards(group.members),
    progress: {
      owned: progress.owned,
      total: progress.total,
      complete: progress.complete,
      sets: { owned: progress.completeSets, total: progress.totalSets },
    },
  };
}

/** The hub's tile list: every franchise collapsed to its one synthetic section. */
export function groupedHubSections(sections: ThemeSection[]): ThemeSection[] {
  return groupFranchises(sections).map((entry) =>
    isFranchiseGroup(entry) ? franchiseSection(entry) : entry,
  );
}

/** A franchise key read back off a synthetic section's `theme.id`, or null. */
export function franchiseKeyFromThemeId(id: string): string | null {
  return id.startsWith(FRANCHISE_ID_PREFIX) ? id.slice(FRANCHISE_ID_PREFIX.length) : null;
}

/** Where tapping a `CategoryPicker` tile's `theme.id` should go. */
export function hubTarget(themeId: string): Place {
  const key = franchiseKeyFromThemeId(themeId);
  return key ? { kind: "franchise", key } : { kind: "category", themeId };
}

/** Every franchise key with at least one member in `sections` (place parsing). */
export function franchiseKeysIn(sections: ThemeSection[]): Set<string> {
  return new Set(groupFranchises(sections).filter(isFranchiseGroup).map((g) => g.key));
}

/** Resolve a franchise place's own members, for the sub-hub screen. */
export function franchiseByKey(sections: ThemeSection[], key: string): FranchiseGroup | null {
  return groupFranchises(sections).filter(isFranchiseGroup).find((g) => g.key === key) ?? null;
}

/** Where a theme's own "back" should land: its franchise sub-hub, or null if it has none. */
export function franchisePlaceForTheme(theme: Theme): Place | null {
  const label = franchiseLabelForTheme(theme);
  return label ? { kind: "franchise", key: franchiseKey(label) } : null;
}
