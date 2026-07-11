import Link from "next/link";
import { getAdminOverview } from "@/features/admin/service";
import { ChildAdminRow } from "@/features/admin/ChildAdminRow";

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview(); // requireParent inside

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6" data-testid="admin-dashboard">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Parent Admin</h1>
        <nav className="flex gap-4 text-sm underline opacity-80">
          <Link href="/admin/profiles" data-testid="admin-profiles-link">
            Profiles
          </Link>
          <Link href="/play">Play</Link>
        </nav>
      </header>

      <p className="text-sm opacity-70" data-testid="pool-summary">
        Pool: {overview.themes} themes · {overview.cards} cards
      </p>

      {overview.children.length === 0 ? (
        <p className="opacity-70">
          No profiles yet.{" "}
          <Link href="/admin/profiles" className="underline">
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
