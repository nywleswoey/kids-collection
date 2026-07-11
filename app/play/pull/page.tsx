import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import { getBalance } from "@/features/pull/token-service";
import { PullButton } from "@/features/pull/PullButton";

export default async function PullPage() {
  await requireParent();
  const child = await getActiveChild();
  if (!child) redirect("/play");

  const balance = await getBalance(child.id);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 p-8"
      data-testid="pull-screen"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="pill pill--gold">🚀 Launch time</span>
        <h1 className="text-3xl font-bold">
          Ready, <span className="title-pop">{child.name}</span>?
        </h1>
      </div>
      <PullButton initialBalance={balance} />
      <div className="flex gap-3 text-sm">
        <Link
          href="/play/binder"
          data-testid="go-binder-link"
          className="btn btn--ghost"
        >
          🪐 My Galaxy
        </Link>
        <Link href="/play/home" className="btn btn--ghost">
          🏠 Home
        </Link>
      </div>
    </main>
  );
}
