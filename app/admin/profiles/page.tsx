import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { profileService } from "@/features/profiles/service.prod";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { ProfileRow } from "@/features/profiles/ProfileRow";
import { requireAdminGate } from "@/features/admin/gate";

export default async function ProfileManagerPage() {
  await requireParent(); // parent-only (U2-BR5)
  await requireAdminGate(); // U4-FR1 passcode gate
  const kids = await profileService.listChildren();

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
          <ProfileRow
            key={c.id}
            id={c.id}
            name={c.name}
            avatar={c.avatar}
            pullTokens={c.pullTokens}
            easterEggTickets={c.easterEggTickets}
          />
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
