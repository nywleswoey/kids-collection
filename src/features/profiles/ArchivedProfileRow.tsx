import { AvatarBadge } from "@/features/ui/AvatarBadge";
import { restoreProfileAction } from "./actions";

/** Stable, locale-independent day stamp — "archived 3 weeks ago" would need a
 *  clock this row does not have, and the exact day is what a parent checks. */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * One archived profile on the parent's undo list (#97). Read-only apart from
 * Restore: an archived profile is inert until it is back, so there is no Edit
 * here and `ProfileStore.update` would refuse one anyway.
 */
export function ArchivedProfileRow({
  id,
  name,
  avatar,
  archivedAt,
}: {
  id: string;
  name: string;
  avatar: string;
  archivedAt: Date;
}) {
  return (
    <li
      className="panel flex items-center justify-between p-3 opacity-70"
      data-testid={`archived-profile-row-${id}`}
    >
      <span className="flex items-center gap-3">
        <AvatarBadge avatar={avatar} className="h-11 w-11 text-xl grayscale" />
        <span className="flex flex-col">
          <span className="display font-semibold">{name}</span>
          <span className="text-xs text-[color:var(--ink-mute)]">
            archived {DAY.format(archivedAt)}
          </span>
        </span>
      </span>
      <form action={restoreProfileAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          data-testid={`profile-restore-${id}`}
          className="rounded-lg bg-emerald-500/20 px-3 py-1 text-sm text-emerald-100 transition hover:bg-emerald-500/30"
        >
          Restore
        </button>
      </form>
    </li>
  );
}
