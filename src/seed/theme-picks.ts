/**
 * Pure derivation logic for `pnpm theme-picks` (see `docs/NEW-THEME-RUNBOOK.md`
 * Step 8 and AGENTS.md). Decides, for one theme, which provider each card's
 * `cards.json` entry should record and which should be the theme's default —
 * no filesystem, no CLI invocation, so it is unit-testable on its own.
 *
 * By default every card's pick is the judge's recommendation (`pnpm
 * theme-images`'s `judgeTheme`, reused unchanged — see `scripts/theme-images/
 * judge-theme.ts`): `single`/`cached`/`judged` all carry a `winner`. `--use`
 * overrides any card by name, pre-alias-resolved by the caller. A card with
 * neither a recommendation (`missing`/`unjudged`) nor an override refuses the
 * whole run, by name — Step 8 must never silently guess at an unjudged card.
 *
 * The theme's default `provider` is whichever provider wins the most cards;
 * ties break toward whichever of the tied providers wins its first card
 * earliest in theme order, so the result is deterministic. Only cards whose
 * final pick differs from that default get a `cardOverrides` entry — the
 * same sparse-override shape Step 8 has always described.
 */

export class ThemePicksError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemePicksError";
  }
}

/** Short, unambiguous aliases for `--use`, tried before the registry id itself. */
const PROVIDER_ALIASES: Record<string, string> = {
  grok: "supergrok-manual",
  cloudflare: "cloudflare-sdxl",
};

/**
 * Resolve a `--use` provider token to a registry id. Returns the raw token
 * unchanged when it is already a registered id or matches no alias, so the
 * caller's registry validation reports it as unknown by its original
 * spelling rather than a silently-substituted one.
 */
export function resolveProviderAlias(raw: string, providerIds: readonly string[]): string {
  if (providerIds.includes(raw)) return raw;
  const aliased = PROVIDER_ALIASES[raw];
  return aliased && providerIds.includes(aliased) ? aliased : raw;
}

export interface CardRecommendation {
  /** The judge's (or single-candidate rule's) pick; undefined when the card is unjudged or has no candidate. */
  providerId?: string;
}

export interface DeriveThemePicksOptions {
  /** This theme's card names, in theme order. */
  cardNames: readonly string[];
  /** One entry per card name in `cardNames` (a missing entry is treated as unresolved). */
  recommendations: ReadonlyMap<string, CardRecommendation>;
  /** `--use` overrides, card name -> already alias-resolved provider id. */
  overrides: ReadonlyMap<string, string>;
  /** Registered provider ids, for validating `overrides`. */
  providerIds: readonly string[];
}

export interface ThemePicksResult {
  themeProvider: string;
  /** Sparse: only cards whose final pick differs from `themeProvider`. */
  cardOverrides: Readonly<Record<string, string>>;
  counts: {
    total: number;
    /** Cards whose final pick came from `overrides` rather than the judge. */
    fromOverride: number;
    /** Cards whose final pick differs from `themeProvider` (== Object.keys(cardOverrides).length). */
    differFromThemeProvider: number;
  };
}

/**
 * Derive the theme-level and sparse per-card `provider` values Step 8 writes.
 * Throws `ThemePicksError`, naming every offending card, for an unknown
 * override card name, an unregistered override provider id, or a card left
 * unresolved (no recommendation and no override) — never partially applies.
 */
export function deriveThemePicks(opts: DeriveThemePicksOptions): ThemePicksResult {
  const { cardNames, recommendations, overrides, providerIds } = opts;

  const unknownCardNames = [...overrides.keys()].filter((name) => !cardNames.includes(name));
  if (unknownCardNames.length > 0) {
    throw new ThemePicksError(
      `--use names card(s) not in this theme: ${unknownCardNames.join(", ")}.\n` +
        `   Cards in this theme: ${cardNames.join(", ")}`,
    );
  }

  const unknownProviders = [...overrides.entries()]
    .filter(([, id]) => !providerIds.includes(id))
    .map(([name, id]) => `${name}=${id}`);
  if (unknownProviders.length > 0) {
    throw new ThemePicksError(
      `--use names unregistered provider(s): ${unknownProviders.join(", ")}.\n` +
        `   Registered: ${providerIds.join(", ")}`,
    );
  }

  const final = new Map<string, string>();
  const unresolved: string[] = [];
  for (const name of cardNames) {
    const override = overrides.get(name);
    if (override !== undefined) {
      final.set(name, override);
      continue;
    }
    const recommended = recommendations.get(name)?.providerId;
    if (recommended !== undefined) {
      final.set(name, recommended);
    } else {
      unresolved.push(name);
    }
  }

  if (unresolved.length > 0) {
    throw new ThemePicksError(
      `${unresolved.length} card(s) have no judged recommendation and no --use override:\n` +
        unresolved.map((name) => `   - ${name}`).join("\n") +
        `\n   Run "pnpm theme-images" to judge them, or pass --use "<Card Name>=<provider>" for each.`,
    );
  }

  const counts = new Map<string, number>();
  for (const name of cardNames) {
    const id = final.get(name)!;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let themeProvider = final.get(cardNames[0]!)!;
  let best = 0;
  for (const name of cardNames) {
    const id = final.get(name)!;
    const n = counts.get(id)!;
    if (n > best) {
      best = n;
      themeProvider = id;
    }
  }

  const cardOverrides: Record<string, string> = {};
  for (const name of cardNames) {
    const id = final.get(name)!;
    if (id !== themeProvider) cardOverrides[name] = id;
  }

  return {
    themeProvider,
    cardOverrides,
    counts: {
      total: cardNames.length,
      fromOverride: overrides.size,
      differFromThemeProvider: Object.keys(cardOverrides).length,
    },
  };
}
