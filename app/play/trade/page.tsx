import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { listChildren } from "@/features/profiles/service";
import { tradeService } from "@/features/trade/trade-service.prod";
import { TradeFlow } from "@/features/trade/TradeFlow";

export default async function TradePage() {
  const child = await requireActivePlayer();

  const [myCards, all] = await Promise.all([
    tradeService.listTradableCards(child.id),
    listChildren(),
  ]);
  const friends = all
    .filter((c) => c.id !== child.id)
    .map((c) => ({ id: c.id, name: c.name, avatar: c.avatar }));

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
          Trade a double for a friend&apos;s double of the same rarity.
        </p>
      </div>

      <TradeFlow myCards={myCards} friends={friends} />

      <div className="flex gap-3 text-sm">
        <Link href="/play/home" className="btn btn--ghost">
          🏠 Home
        </Link>
      </div>
    </main>
  );
}
