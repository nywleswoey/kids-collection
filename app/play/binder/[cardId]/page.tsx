import Link from "next/link";
import { notFound } from "next/navigation";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { binderService } from "@/features/binder/service.prod";
import { Card } from "@/features/card/Card";
import { SacrificePanel } from "@/features/pull/SacrificePanel";
import { SACRIFICE_MIN } from "@/features/pull/sacrifice";
import { backHref } from "@/features/binder/binder-place";

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const child = await requireActivePlayer();

  const [{ cardId }, { from }] = await Promise.all([params, searchParams]);
  const detail = await binderService.getCardDetail(child.id, cardId);
  if (!detail) notFound(); // owned-only (U5-BR4/SEC-2)

  // Back to the place the child tapped this card from — the burn pile is a
  // loop, so returning to the hub cost a re-entry on every card (#108).
  const back = backHref(from, detail.card.themeId);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"
      data-testid="card-detail"
    >
      <Card card={detail.card} interactive size="lg" count={detail.count} />
      {detail.count > 1 ? (
        <p className="pill pill--gold">📚 You own {detail.count} of these</p>
      ) : null}
      {detail.count >= SACRIFICE_MIN ? (
        <SacrificePanel cardId={detail.card.id} count={detail.count} />
      ) : null}
      <Link href={back} className="btn btn--ghost text-sm">
        ← Back to My Galaxy
      </Link>
    </main>
  );
}
