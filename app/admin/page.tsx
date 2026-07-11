import Link from "next/link";
import { getAdminOverview } from "@/features/admin/service";
import { ChildAdminRow } from "@/features/admin/ChildAdminRow";

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview(); // requireParent inside

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6" data-testid="admin-dashboard">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">🛠️ Parent Admin</h1>
          <p className="text-sm text-[color:var(--ink-mute)]" data-testid="pool-summary">
            Pool: {overview.themes} themes · {overview.cards} cards
          </p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link
            href="/admin/profiles"
            data-testid="admin-profiles-link"
            className="btn btn--ghost"
          >
            Profiles
          </Link>
          <Link href="/play" className="btn btn--ghost">
            Play
          </Link>
        </nav>
      </header>

      {overview.children.length === 0 ? (
        <p className="panel px-6 py-4 text-[color:var(--ink-soft)]">
          No profiles yet.{" "}
          <Link href="/admin/profiles" className="link-soft">
            Add one
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {overview.children.map((row) => (
            <ChildAdminRow key={row.child.id} row={row} />
          ))}
        </ul>
      )}
    </main>
  );
}
