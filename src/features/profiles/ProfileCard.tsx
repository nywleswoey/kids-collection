import { AvatarBadge } from "@/features/ui/AvatarBadge";
import { selectProfileAction } from "./actions";

/**
 * Child profile selection card. Tappable card showing avatar and name that
 * submits profile selection form. Used on profile picker screen.
 */
export function ProfileCard({
  id,
  name,
  avatar,
}: {
  id: string;
  name: string;
  avatar: string;
}) {
  return (
    <form action={selectProfileAction}>
      <input type="hidden" name="childId" value={id} />
      <button
        type="submit"
        data-testid={`profile-card-${id}`}
        className="panel group flex h-52 w-44 flex-col items-center justify-center gap-3 p-4 text-center transition duration-200 hover:-translate-y-1.5 hover:[box-shadow:var(--shadow-soft),var(--shadow-glow)] focus-visible:outline-none focus-visible:[box-shadow:var(--ring-focus)] active:scale-95"
      >
        <AvatarBadge
          avatar={avatar}
          className="h-28 w-28 text-7xl transition group-hover:scale-105"
        />
        <span className="display text-xl font-semibold">{name}</span>
      </button>
    </form>
  );
}
