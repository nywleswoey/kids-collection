import { avatarEmoji } from "@/lib/avatars";

/**
 * Shared hero-avatar badge: a `hero-avatar` span rendering the emoji for an
 * avatar key, hidden from assistive tech. Callers pass size/extra utility
 * classes via `className` (e.g. `h-9 w-9 text-lg`).
 */
export function AvatarBadge({
  avatar,
  className,
}: {
  avatar: string;
  className: string;
}) {
  return (
    <span className={`hero-avatar ${className}`} aria-hidden>
      {avatarEmoji(avatar)}
    </span>
  );
}
