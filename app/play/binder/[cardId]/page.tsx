import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { binderService } from "@/features/binder/service.prod";
import { Card } from "@/features/card/Card";
import { SacrificePanel } from "@/features/pull/SacrificePanel";

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const child = await requireActivePlayer();

  const { cardId } = await params;
  const detail = await binderService.getCardDetail(child.id, cardId);
  if (!detail) notFound(); // owned-only (U5-BR4/SEC-2)

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
      data-testid="card-detail"
    >
      <Card card={detail.card} interactive size="lg" count={detail.count} />
      {detail.count > 1 ? (
        <p className="pill pill--gold">📚 You own {detail.count} of these</p>
      ) : null}
      {detail.count >= 3 ? (
        <SacrificePanel cardId={detail.card.id} count={detail.count} />
      ) : null}
      <Link href="/play/binder" className="btn btn--ghost text-sm">
        ← Back to My Galaxy
      </Link>
    </main>
  );
}
