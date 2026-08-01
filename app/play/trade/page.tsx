import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { tradeService } from "@/features/trade/trade-service.prod";
import { TradeBoard } from "@/features/trade/TradeBoard";

export default async function TradePage() {
  const child = await requireActivePlayer();

  const [myCards, friends] = await Promise.all([
    tradeService.listTradableCards(child.id),
    tradeService.listFriendSummaries(child.id),
  ]);

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-8 p-8"
      data-testid="trade-screen"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="pill pill--gold">🤝 Trading post</span>
        <h1 className="text-3xl font-bold">
          Swap doubles, <span className="title-pop">{child.name}</span>!
        </h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Pick a friend, then swap a double for one of theirs — same rarity. 🎁 marks a card the
          other player doesn&apos;t have yet.
        </p>
      </div>

      <TradeBoard myCards={myCards} friends={friends} />

      <div className="flex gap-3 text-sm">
        <Link href="/play/home" className="btn btn--ghost">
          🏠 Home
        </Link>
      </div>
    </main>
  );
}
