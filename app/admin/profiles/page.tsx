import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { listChildren } from "@/features/profiles/service";
import { avatarEmoji } from "@/lib/avatars";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { RemoveProfileButton } from "@/features/profiles/RemoveProfileButton";

export default async function ProfileManagerPage() {
  await requireParent(); // parent-only (U2-BR5)
  const kids = await listChildren();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8" data-testid="profile-manager">
      <div className="panel flex items-center justify-between p-5">
        <h1 className="text-2xl font-bold">👥 Manage Profiles</h1>
        <Link href="/play" className="btn btn--ghost text-sm">
          ← Back
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {kids.map((c) => (
          <li
            key={c.id}
            className="panel flex items-center justify-between p-3"
            data-testid={`profile-row-${c.id}`}
          >
            <span className="flex items-center gap-3">
              <span className="hero-avatar h-11 w-11 text-xl" aria-hidden>
                {avatarEmoji(c.avatar)}
              </span>
              <span className="display font-semibold">{c.name}</span>
              <span className="pill text-xs">🎟️ {c.pullTokens}</span>
            </span>
            <RemoveProfileButton id={c.id} name={c.name} />
          </li>
        ))}
        {kids.length === 0 ? (
          <li className="text-[color:var(--ink-mute)]">
            No profiles yet — add one below.
          </li>
        ) : null}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a profile</h2>
        <ProfileForm />
      </section>
    </main>
  );
}
