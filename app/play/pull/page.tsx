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
      <h1 className="text-2xl font-bold">Hi, {child.name}! Pull a card 🃏</h1>
      <PullButton initialBalance={balance} />
      <div className="flex gap-4 text-sm underline opacity-80">
        <Link href="/play/binder" data-testid="go-binder-link">
          My binder
        </Link>
        <Link href="/play/home">Home</Link>
      </div>
    </main>
  );
}
