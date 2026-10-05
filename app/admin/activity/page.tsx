import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { requireAdminGate } from "@/features/admin/gate";
import { activityService } from "@/features/activity/activity-service.prod";
import { profileService } from "@/features/profiles/service.prod";
import type { ActivityEvent } from "@/features/activity/types";

export const dynamic = "force-dynamic";

function formatAt(at: string): string {
  return new Date(at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
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

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ childId?: string | string[] }>;
}) {
  await requireParent(); // U2-SEC — parent-only
  await requireAdminGate(); // U4-FR1 passcode gate (defense in depth)

  const { childId: rawChildId } = await searchParams;
  const childId = typeof rawChildId === "string" && rawChildId.length > 0 ? rawChildId : null;

  const [children, events] = await Promise.all([
    profileService.listChildren(),
    activityService.getActivityLog(childId, 100),
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
          href="/admin/activity"
          data-testid="admin-activity-filter-all"
          className={childId === null ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
        >
          All
        </Link>
        {children.map((c) => (
          <Link
            key={c.id}
            href={`/admin/activity?childId=${c.id}`}
            data-testid={`admin-activity-filter-${c.id}`}
            className={childId === c.id ? "btn btn--primary text-sm" : "btn btn--ghost text-sm"}
          >
            {c.name}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-4 text-[color:var(--ink-soft)]">
          <span>No activity yet.</span>
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
