import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { tokenService } from "@/features/pull/token-service.prod";
import { PullButton } from "@/features/pull/PullButton";
import { listCards, listThemes } from "@/features/pool/service";

export default async function PullPage() {
  const child = await requireActivePlayer();

  const balance = await tokenService.getBalance(child.id);
  const [allCards, themes, special] = await Promise.all([
    listCards(),
    listThemes(),
    tokenService.getSpecialBalances(child.id),
  ]);
  // Card fronts flashed during the pre-reveal slot-machine (FR1).
  const flashPool = allCards.map((c) => ({
    id: c.id,
    imageUrl: c.imageUrl,
    rarity: c.rarity,
  }));

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
      <PullButton
        childId={child.id}
        initialBalance={balance}
        flashPool={flashPool}
        themes={themes.map((t) => ({ id: t.id, name: t.name }))}
        epicTickets={special.epic}
        luckyTickets={special.lucky}
        pickTickets={child.pickTickets}
      />
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
