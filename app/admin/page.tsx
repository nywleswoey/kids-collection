import Link from "next/link";
import { getAdminOverview } from "@/features/admin/service";
import { ChildAdminRow } from "@/features/admin/ChildAdminRow";
import { requireAdminGate } from "@/features/admin/gate";
import { quizService } from "@/features/quiz/quiz-service.prod";

export default async function AdminDashboardPage() {
  await requireAdminGate(); // U4-FR1 passcode gate (defense in depth)
  const overview = await getAdminOverview(); // requireParent inside
  const quizByChild = new Map(
    await Promise.all(
      overview.children.map(
        async (r) => [r.child.id, await quizService.getQuizActivity(r.child.id)] as const,
      ),
    ),
  );

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
            href="/admin/preview"
            data-testid="admin-preview-link"
            className="btn btn--ghost"
          >
            Preview
          </Link>
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
        <div className="panel flex flex-col items-center gap-3 px-6 py-4 text-[color:var(--ink-soft)]">
          <span>No profiles yet.</span>
          <Link href="/admin/profiles" className="btn btn--ghost">
            ➕ Add one
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {overview.children.map((row) => (
            <ChildAdminRow
              key={row.child.id}
              row={row}
              quiz={quizByChild.get(row.child.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
