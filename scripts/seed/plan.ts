/**
 * What `--review` and `--sync` share before they diverge: the set of cards this
 * run would insert, narrowed by `--themes`. Both commands compute it from the
 * SAME plan, which is what lets `--sync`'s FR9 refusal and `--review`'s card
 * set never disagree.
 */
import { planInserts, cardKey } from "@/seed/publish-plan";
import type { SeedFile, ThemeSeed } from "@/seed/seed-schema";
import type { SeedDeps } from "./deps";

export interface RunPlan {
  /** The themes this run touches: every theme, or the `--themes` subset. */
  themes: readonly ThemeSeed[];
  /** `cardKey`s of cards not yet published, across the FULL seed. */
  planned: ReadonlySet<string>;
}

/**
 * Reads the pool for the already-published keys and plans the inserts.
 *
 * `--themes` is resolved against the FULL seed so an unscoped theme is never
 * mistaken for a typo in a scoped one; everything after this (the bake-off,
 * FR9's gates, the publish loop, and FR12's completeness check) then sees only
 * the subset. Pruning is deliberately NOT scoped: `previewPrune` /
 * `deleteThemesNotIn` compare against the full seed, so an unscoped theme —
 * still present in cards.json, just not part of this run — is never pruned for
 * being out of scope.
 *
 * Returns `null` after printing the error when `--themes` names an unknown
 * theme; the caller exits 1.
 */
export async function planRun(
  deps: SeedDeps,
  seed: SeedFile,
  themeNames: readonly string[] | undefined,
): Promise<RunPlan | null> {
  const published = await deps.listPublishedCardKeys();
  const plan = planInserts(seed, published);
  const planned = new Set(plan.map((p) => cardKey(p.theme, p.card)));

  let themes: readonly ThemeSeed[] = seed.themes;
  if (themeNames !== undefined) {
    const wanted = new Set(themeNames);
    const known = new Set(seed.themes.map((t) => t.name));
    const unknown = [...wanted].filter((name) => !known.has(name));
    if (unknown.length > 0) {
      deps.error(
        `\n⛔ --themes names theme(s) not found in seed-content/cards.json: ${unknown.join(", ")}\n`,
      );
      return null;
    }
    themes = seed.themes.filter((t) => wanted.has(t.name));
    deps.log(`Scoped to ${themes.length} theme(s): ${themes.map((t) => t.name).join(", ")}`);
  }
  return { themes, planned };
}

/** The "Seed starting" banner both pipeline commands print first. */
export function announceRun(deps: SeedDeps, seed: SeedFile, mode: "review" | "sync"): void {
  const totalCards = seed.themes.reduce((n, t) => n + t.cards.length, 0);
  deps.log(
    `Seed starting — mode=${mode}, ${seed.themes.length} themes, ${totalCards} cards.`,
  );
}
