/**
 * Orchestrates `pnpm theme-images`'s judge step over a whole theme: for each
 * card, find whichever providers' candidates actually landed in
 * `seed-content/review/` and hand them to `judgeCard` (`src/shared/pool/judge.ts`).
 *
 * Takes its filesystem as injected callbacks (`exists`/`read`), the same shape
 * `scripts/seed/index.ts`'s `SeedDeps` uses, so this is testable with an
 * in-memory file map and no real `seed-content/review/` directory.
 */
import { buildPrompt } from "@/shared/pool/prompt";
import { reviewFileName } from "@/shared/pool/review-files";
import { judgeCard, type JudgeCache, type JudgeCandidate, type JudgeRunner } from "@/shared/pool/judge";
import type { JudgeTableRow } from "@/shared/pool/judge-table";
import type { ImageProvider } from "@/shared/pool/providers";
import type { SeedCard, ThemeSeed } from "@/shared/pool/seed-schema";

export interface JudgeThemeDeps {
  exists: (path: string) => boolean;
  read: (path: string) => Uint8Array;
}

/** Absolute path of one provider's candidate for one card. */
export function reviewPath(
  reviewDir: string,
  themeName: string,
  card: Pick<SeedCard, "name" | "imagePrompt">,
  provider: ImageProvider,
  joinPath: (a: string, b: string) => string,
): string {
  return joinPath(reviewDir, reviewFileName(themeName, card, provider));
}

/**
 * Judge every card in the theme against the candidates actually on disk.
 * Never throws: a per-card judge failure is carried in that row's `outcome`.
 */
export function judgeTheme(
  theme: ThemeSeed,
  providers: readonly ImageProvider[],
  reviewDir: string,
  joinPath: (a: string, b: string) => string,
  deps: JudgeThemeDeps,
  cache: JudgeCache,
  runJudge: JudgeRunner | undefined,
): JudgeTableRow[] {
  return theme.cards.map((card) => {
    const prompt = buildPrompt(card);
    const present = providers
      .map((provider) => {
        const path = reviewPath(reviewDir, theme.name, card, provider, joinPath);
        return deps.exists(path) ? { providerId: provider.id, path } : undefined;
      })
      .filter((c): c is { providerId: string; path: string } => c !== undefined);

    const candidates: JudgeCandidate[] = present.map((c) => ({
      providerId: c.providerId,
      path: c.path,
      bytes: deps.read(c.path),
    }));

    const outcome = judgeCard({
      cardName: card.name,
      imagePrompt: prompt,
      candidates,
      cache,
      runJudge,
    });

    return {
      name: card.name,
      rarity: card.rarity,
      imagePrompt: prompt,
      candidates: providers.map((provider) => ({
        providerId: provider.id,
        fileName: present.find((c) => c.providerId === provider.id)
          ? reviewFileName(theme.name, card, provider)
          : undefined,
      })),
      outcome,
    };
  });
}
