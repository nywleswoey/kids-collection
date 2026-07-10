import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import { getCardDetail } from "@/features/binder/service";
import { PullResultView } from "@/features/pull/PullResultView";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  await requireParent();
  const child = await getActiveChild();
  if (!child) redirect("/play");

  const { cardId } = await params;
  const detail = await getCardDetail(child.id, cardId);
  if (!detail) notFound(); // owned-only (U5-BR4/SEC-2)

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
      data-testid="card-detail"
    >
      {/* Placeholder card view; U6 replaces with full effects. */}
      <PullResultView card={detail.card} isDuplicate={detail.count > 1} />
      {detail.count > 1 ? (
        <p className="opacity-80">You own {detail.count} of these.</p>
      ) : null}
      <Link href="/play/binder" className="text-sm underline opacity-80">
        ← Back to binder
      </Link>
    </main>
  );
}
