import { avatarEmoji } from "@/lib/avatars";
import { selectProfileAction } from "./actions";

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
        className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-3xl bg-white/10 p-4 text-center shadow-lg transition hover:scale-105 hover:bg-white/20 active:scale-95"
      >
        <span className="text-6xl" aria-hidden>
          {avatarEmoji(avatar)}
        </span>
        <span className="text-xl font-semibold">{name}</span>
      </button>
    </form>
  );
}
