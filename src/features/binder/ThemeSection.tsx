import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { ProgressBar } from "./ProgressBar";
import { CardSlot } from "./CardSlot";
import { SetCompleteCelebration } from "./SetCompleteCelebration";

export function ThemeSection({
  section,
  admin = false,
}: {
  section: ThemeSectionData;
  /** Admin preview: show source links, no play links, no auto-celebration. */
  admin?: boolean;
}) {
  return (
    <section
      data-testid={`theme-section-${section.theme.id}`}
      className="panel flex flex-col gap-4 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{section.theme.name}</h2>
        <ProgressBar
          themeId={section.theme.id}
          owned={section.progress.owned}
          total={section.progress.total}
          complete={section.progress.complete}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {section.cards.map((entry) => (
          <CardSlot key={entry.card.id} entry={entry} admin={admin} />
        ))}
      </div>
      {section.progress.complete && !admin ? (
        <SetCompleteCelebration themeId={section.theme.id} />
      ) : null}
    </section>
  );
}
