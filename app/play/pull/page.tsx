import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { tokenService } from "@/features/pull/token-service.prod";
import { PullButton } from "@/features/pull/PullButton";
import { recentCategories } from "@/features/pull/categories";
import { listCards, listThemes } from "@/features/pool/service";

export default async function PullPage() {
  const child = await requireActivePlayer();

  const balance = await tokenService.getBalance(child.id);
  const [allCards, themes, easterEggTickets] = await Promise.all([
    listCards(),
    listThemes(),
    tokenService.getEasterEggBalance(child.id),
  ]);
  // Only the most recent categories get a chip, so the row stays readable on a
  // phone (Inc21 FR3). Capped here, server-side, so the hidden ones are never
  // serialized into the client payload. 🎲 Random still draws from all of them.
  const visibleThemes = recentCategories(themes);
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
        themes={visibleThemes.map((t) => ({ id: t.id, name: t.name }))}
        easterEggTickets={easterEggTickets}
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
