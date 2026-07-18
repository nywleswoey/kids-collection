import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { getSpecialBalances } from "@/features/pull/token-service";
import { avatarEmoji } from "@/lib/avatars";
import { switchProfileAction } from "@/features/profiles/actions";

export default async function PlayHomePage() {
  const child = await requireActivePlayer();

  // FR1 (Inc10): surface special-egg tickets on the landing page so they don't
  // silently read as "0 tickets". Inc13 FR3: show every ticket type explicitly
  // (normal / epic / lucky) so the child sees all their counts at a glance.
  const { epic, lucky } = await getSpecialBalances(child.id);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center"
      data-testid="play-home"
    >
      <div className="hero-avatar h-32 w-32 text-6xl float" aria-hidden>
        {avatarEmoji(child.avatar)}
      </div>
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-4xl font-bold">
          Hi, <span className="title-pop">{child.name}</span>!
        </h1>
        <div
          className="flex flex-wrap items-center justify-center gap-2"
          data-testid="ticket-counts"
        >
          <span className="pill pill--gold" data-testid="token-balance">
            🎟️ {child.pullTokens} ticket{child.pullTokens === 1 ? "" : "s"}
          </span>
          <span className="pill pill--gold" data-testid="epic-balance">
            ✨ {epic} epic
          </span>
          <span className="pill pill--gold" data-testid="lucky-balance">
            🍀 {lucky} lucky
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/play/pull"
          data-testid="go-pull-link"
          className="btn btn--primary btn--lg"
        >
          🚀 Discover a card
        </Link>
        <Link href="/play/binder" className="btn btn--ghost btn--lg">
          🪐 My Galaxy
        </Link>
        <Link
          href="/play/trade"
          data-testid="go-trade-link"
          className="btn btn--ghost btn--lg"
        >
          🤝 Trade cards
        </Link>
        <Link
          href="/play/learn"
          data-testid="go-learn-link"
          className="btn btn--ghost btn--lg"
        >
          🧠 Play &amp; Learn
        </Link>
      </div>
      <form action={switchProfileAction}>
        <button
          type="submit"
          data-testid="switch-profile-button"
          className="btn btn--ghost"
        >
          🔄 Switch profile
        </button>
      </form>
    </main>
  );
}
