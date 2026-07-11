import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import { avatarEmoji } from "@/lib/avatars";
import { switchProfileAction } from "@/features/profiles/actions";

export default async function PlayHomePage() {
  await requireParent();
  const child = await getActiveChild();
  if (!child) redirect("/play"); // U2-SEC-7: invalid/missing profile → picker

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
        <p className="pill pill--gold" data-testid="token-balance">
          🎟️ {child.pullTokens} pull{child.pullTokens === 1 ? "" : "s"} ready
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/play/pull"
          data-testid="go-pull-link"
          className="btn btn--primary btn--lg"
        >
          ✨ Pull a card
        </Link>
        <Link href="/play/binder" className="btn btn--ghost btn--lg">
          📖 My binder
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
