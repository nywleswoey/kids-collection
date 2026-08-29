import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { CardImage } from "@/features/card/CardImage";
import { coverCard } from "./category-cover";

/**
 * The galaxy's category picker (#107). A grid of picture tiles — one per
 * category — that the binder lands on. Tapping one enters that category.
 *
 * This replaces the wrapped sticky row of one chip per theme, which grew by one
 * every time the seed runbook shipped 30 more cards and was already three or
 * four wrapped lines on a phone at 16 themes. A tile grid grows *downwards*
 * instead of pushing the cards off screen, so it still reads at 25+ themes; and
 * tapping a picture is the cheap interaction for the youngest player, where
 * reading a row of names is the expensive one.
 *
 * A finished category is called out with the same 🏆 "Set complete!" language
 * the reward modal celebrates it with, so the tile and the celebration are one
 * promise rather than two marks the child has to learn separately.
 */
export function CategoryPicker({
  sections,
  onOpen,
}: {
  sections: ThemeSectionData[];
  onOpen: (themeId: string) => void;
}) {
  return (
    <div
      data-testid="galaxy-category-picker"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3"
    >
      {sections.map((section) => (
        <CategoryTile
          key={section.theme.id}
          section={section}
          onOpen={() => onOpen(section.theme.id)}
        />
      ))}
    </div>
  );
}

function CategoryTile({
  section,
  onOpen,
}: {
  section: ThemeSectionData;
  onOpen: () => void;
}) {
  const { theme, progress } = section;
  const cover = coverCard(section);
  const pct = progress.total > 0 ? Math.round((progress.owned / progress.total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={`galaxy-category-${theme.id}`}
      aria-label={
        progress.complete
          ? `${theme.name}: set complete, all ${progress.total} collected`
          : `${theme.name}: ${progress.owned} of ${progress.total} collected`
      }
      className="panel slot-pop flex flex-col overflow-hidden p-0 text-left"
    >
      <span className="relative block">
        {cover ? (
          <CardImage src={cover.card.imageUrl} alt="" dim={256} loading="lazy" />
        ) : (
          // Nothing owned here yet — a neutral placeholder, never a dimmed
          // thumbnail: unearned art stays unearned (U5-Q5).
          <span className="flex aspect-square w-full items-center justify-center bg-black/20 text-4xl opacity-45">
            🪐
          </span>
        )}
        {progress.complete ? (
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-[color:var(--brand-1)] px-1 py-1 text-[0.7rem] font-black leading-none text-black">
            🏆 Set complete!
          </span>
        ) : null}
      </span>

      <span className="flex flex-col gap-1.5 p-2.5">
        <span className="line-clamp-1 text-sm font-bold">{theme.name}</span>
        <span className="h-2 overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
          <span
            className="block h-full rounded-full bg-[linear-gradient(90deg,var(--brand-4),var(--brand-1))] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="text-xs font-bold tabular-nums text-[color:var(--ink-soft)]">
          {progress.owned} / {progress.total}
        </span>
      </span>
    </button>
  );
}
