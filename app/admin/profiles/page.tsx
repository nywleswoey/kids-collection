import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { adminService } from "@/features/admin/service.prod";
import { ProfileForm } from "@/features/profiles/ProfileForm";
import { ProfileRow } from "@/features/profiles/ProfileRow";
import { ArchivedProfileRow } from "@/features/profiles/ArchivedProfileRow";
import { profileService } from "@/features/profiles/service.prod";
import { requireAdminGate } from "@/features/admin/gate";

// Force dynamic rendering since this page requires database access
export const dynamic = "force-dynamic";

export default async function ProfileManagerPage() {
  await requireParent(); // parent-only (U2-BR5)
  await requireAdminGate(); // U4-FR1 passcode gate
  // getAdminOverview already folds in each child's distinct-owned count via the
  // existing CollectionStore.ownedCardIds port method — no new read needed for
  // the archive confirmation (Inc23 FR9 / D4=A). It sees ACTIVE children only, so
  // the undo list is a second read (#97) — the one place in the app that looks at
  // the archived half.
  const [{ children: rows }, archived] = await Promise.all([
    adminService.getAdminOverview(),
    profileService.listArchivedProfiles(),
  ]);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8" data-testid="profile-manager">
      <div className="panel flex items-center justify-between p-5">
        <h1 className="text-2xl font-bold">👥 Manage Profiles</h1>
        <Link href="/play" className="btn btn--ghost text-sm">
          ← Back
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <ProfileRow
            key={r.child.id}
            id={r.child.id}
            name={r.child.name}
            avatar={r.child.avatar}
            pullTokens={r.child.pullTokens}
            easterEggTickets={r.child.easterEggTickets}
            ownedCount={r.owned}
          />
        ))}
        {rows.length === 0 ? (
          <li className="text-[color:var(--ink-mute)]">
            No profiles yet — add one below.
          </li>
        ) : null}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a profile</h2>
        <ProfileForm />
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-3" data-testid="archived-profiles">
          <h2 className="text-lg font-semibold">🗄️ Archived profiles</h2>
          <p className="text-sm text-[color:var(--ink-mute)]">
            Hidden from the player picker and the trade board. Their cards, tickets
            and quiz history are all still here — restore to put them back exactly
            as they were.
          </p>
          <ul className="flex flex-col gap-3">
            {archived.map((c) => (
              <ArchivedProfileRow
                key={c.id}
                id={c.id}
                name={c.name}
                avatar={c.avatar}
                archivedAt={c.archivedAt}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
