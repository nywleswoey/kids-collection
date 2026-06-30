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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Profiles</h1>
        <Link href="/play" className="text-sm underline opacity-80">
          ← Back
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {kids.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-2xl bg-white/5 p-3"
            data-testid={`profile-row-${c.id}`}
          >
            <span className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {avatarEmoji(c.avatar)}
              </span>
              <span className="font-semibold">{c.name}</span>
              <span className="text-sm opacity-60">{c.pullTokens} pulls</span>
            </span>
            <RemoveProfileButton id={c.id} name={c.name} />
          </li>
        ))}
        {kids.length === 0 ? (
          <li className="opacity-60">No profiles yet — add one below.</li>
        ) : null}
      </ul>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Add a profile</h2>
        <ProfileForm />
      </section>
    </main>
  );
}
