import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { requireAdminGate } from "@/features/admin/gate";
import { activityService } from "@/features/activity/activity-service.prod";
import { profileService } from "@/features/profiles/service.prod";
import { ACTIVITY_FILTERS, type ActivityEvent, type ActivityFilter } from "@/features/activity/types";
import { parseChildIdParam, parseActivityFilterParam } from "@/features/activity/filters";

export const dynamic = "force-dynamic";

function formatAt(at: string): string {
  return new Date(at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  });
}

/** One line of human text (+ icon) per event kind — the only place that turns
 *  an ActivityEvent into words, so the list below stays a plain map. */
function describe(event: ActivityEvent): { icon: string; text: string } {
  switch (event.type) {
    case "ticket_given": {
      const unit = event.ticket === "pullTokens" ? "pull token" : "🥚 ticket";
      const n = Math.abs(event.amount);
      const plural = `${n} ${unit}${n === 1 ? "" : "s"}`;
      if (event.source === "admin") {
        return {
          icon: "🎁",
          text:
            event.amount >= 0
              ? `Given ${plural}${event.detail ? ` by ${event.detail}` : ""}`
              : `${plural} removed${event.detail ? ` by ${event.detail}` : ""}`,
        };
      }
      if (event.source === "sacrifice") return { icon: "🔥", text: `Earned ${plural} by sacrificing cards` };
      return { icon: "🧠", text: `Earned ${plural} passing ${event.detail ?? "a quiz"}` };
    }
    case "card_received": {
      const action =
        event.via === "pull"
          ? "Used a pull token"
          : event.spent === "pullTokens"
            ? "Used a pull token on an Easter egg"
            : event.spent === "easterEggTickets"
              ? "Used a 🥚 ticket"
              : "Opened an Easter egg";
      return {
        icon: event.via === "pull" ? "🎟️" : "🥚",
        text: `${action} → got ${event.cardName}${event.isDuplicate ? " (duplicate)" : ""}`,
      };
    }
    case "bonus_card":
      return { icon: "🏆", text: `Bonus card for completing a set: ${event.cardName}` };
    case "trade":
      return {
        icon: "🔄",
        text: `Traded ${event.gaveCardName} for ${event.gotCardName} with ${event.withChildName}`,
      };
  }
}

/** Builds `/admin/activity?childId=...&type=...`, omitting a param that is
 *  `null` so "All" never leaves a stale/empty query key in the URL. */
function filterHref(childId: string | null, type: ActivityFilter | null): string {
  const params = new URLSearchParams();
  if (childId) params.set("childId", childId);
  if (type) params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/activity?${qs}` : "/admin/activity";
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string | string[]; type?: string | string[] }>;
}) {
  await requireParent(); // U2-SEC — parent-only
  await requireAdminGate(); // U4-FR1 passcode gate (defense in depth)

  const { childId: rawChildId, type: rawType } = await searchParams;
  const childId = parseChildIdParam(rawChildId);
  const filter = parseActivityFilterParam(rawType);
  const activeFilter = ACTIVITY_FILTERS.find((f) => f.filter === filter) ?? null;

  const [children, events] = await Promise.all([
    profileService.listChildren(),
    activityService.getActivityLog(childId, 100, filter),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6" data-testid="admin-activity">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <h1 className="text-2xl font-bold">📜 Activity Log</h1>
        <Link href="/admin" className="btn btn--ghost text-sm">
          ← Admin
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2" data-testid="admin-activity-filter">
        <Link
          href={filterHref(null, filter)}
          data-testid="admin-activity-filter-all"
          className={childId === null ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
        >
          All
        </Link>
        {children.map((c) => (
          <Link
            key={c.id}
            href={filterHref(c.id, filter)}
            data-testid={`admin-activity-filter-${c.id}`}
            className={childId === c.id ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      <nav className="flex flex-wrap gap-2" data-testid="admin-activity-type-filter">
        <Link
          href={filterHref(childId, null)}
          data-testid="admin-activity-type-filter-all"
          className={filter === null ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
        >
          All types
        </Link>
        {ACTIVITY_FILTERS.map((f) => (
          <Link
            key={f.filter}
            href={filterHref(childId, f.filter)}
            data-testid={`admin-activity-type-filter-${f.filter}`}
            className={filter === f.filter ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
          >
            <span aria-hidden>{f.icon}</span> {f.label}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-4 text-[color:var(--ink-soft)]">
          {activeFilter === null ? (
            <span>No activity yet.</span>
          ) : (
            <>
              <span>{activeFilter.empty}</span>
              <Link
                href={filterHref(childId, null)}
                data-testid="admin-activity-empty-show-all-types"
                className="btn btn--ghost text-sm"
              >
                Show all types
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="admin-activity-list">
          {events.map((event, i) => {
            const { icon, text } = describe(event);
            return (
              <li
                key={i}
                data-testid="admin-activity-row"
                className="panel flex items-start gap-3 p-3 text-sm"
              >
                <span aria-hidden>{icon}</span>
                <div className="flex flex-col">
                  <span>
                    {childId === null ? <strong>{event.childName}</strong> : null}
                    {childId === null ? " — " : null}
                    {text}
                  </span>
                  <time dateTime={event.at} className="text-xs text-[color:var(--ink-mute)]">
                    {formatAt(event.at)}
                  </time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
