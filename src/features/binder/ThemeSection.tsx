import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { CardSlot } from "./CardSlot";
import { SetCompleteCelebration } from "./SetCompleteCelebration";
import type { Place } from "./binder-place";

export function ThemeSection({
  section,
  admin = false,
  heading = true,
  from,
}: {
  section: ThemeSectionData;
  /** Admin preview: show source links, no play links, no auto-celebration. */
  admin?: boolean;
  /**
   * #108: off inside a category, where the sticky place bar already carries the
   * name, the progress bar and its 🏆. On in the admin views, which stack many
   * sections and have nothing else telling them apart.
   */
  heading?: boolean;
  /** Where a tapped card should send the child back to (#108). */
  from?: Place;
}) {
  return (
    <section
      data-testid={`theme-section-${section.theme.id}`}
      className="panel flex flex-col gap-4 p-5"
    >
      {heading ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">{section.theme.name}</h2>
          <ProgressBar
            themeId={section.theme.id}
            owned={section.progress.owned}
            total={section.progress.total}
            complete={section.progress.complete}
          />
        </div>
      ) : null}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {section.cards.map((entry) => (
          <CardSlot key={entry.card.id} entry={entry} admin={admin} from={from} />
        ))}
      </div>
      {section.progress.complete && !admin ? (
        <SetCompleteCelebration themeId={section.theme.id} />
      ) : null}
    </section>
  );
}
