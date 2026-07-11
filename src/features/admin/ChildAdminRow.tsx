import Link from "next/link";
import { avatarEmoji } from "@/lib/avatars";
import { ProgressBar } from "@/features/binder/ProgressBar";
import { GrantControl } from "./GrantControl";
import type { AdminChildRow as Row } from "@/lib/types";

export function ChildAdminRow({ row }: { row: Row }) {
  const { child } = row;
  return (
    <li
      data-testid={`admin-child-${child.id}`}
      className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="hero-avatar h-12 w-12 text-2xl" aria-hidden>
          {avatarEmoji(child.avatar)}
        </span>
        <div className="flex flex-col">
          <span className="font-semibold">{child.name}</span>
          <ProgressBar
            themeId={child.id}
            owned={row.owned}
            total={row.total}
            complete={row.total > 0 && row.owned === row.total}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <GrantControl
          childId={child.id}
          initialBalance={row.balance}
          initialEpic={row.epicTickets}
          initialLucky={row.luckyTickets}
        />
        <Link
          href={`/admin/child/${child.id}/binder`}
          data-testid={`admin-binder-${child.id}`}
          className="text-sm underline opacity-80"
        >
          Binder
        </Link>
      </div>
    </li>
  );
}
