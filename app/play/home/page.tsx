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
      <div className="text-7xl" aria-hidden>
        {avatarEmoji(child.avatar)}
      </div>
      <h1 className="text-3xl font-bold">Hi, {child.name}!</h1>
      <p className="opacity-80" data-testid="token-balance">
        You have {child.pullTokens} pull{child.pullTokens === 1 ? "" : "s"}.
      </p>
      <div className="flex gap-4">
        <Link
          href="/play/pull"
          data-testid="go-pull-link"
          className="rounded-xl bg-gradient-to-br from-amber-300 to-pink-400 px-6 py-3 font-bold text-gray-900 transition hover:scale-105"
        >
          ✨ Pull a card
        </Link>
        <Link
          href="/play/binder"
          className="rounded-xl bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
        >
          📖 My binder
        </Link>
      </div>
      <form action={switchProfileAction}>
        <button
          type="submit"
          data-testid="switch-profile-button"
          className="rounded-xl bg-white/10 px-5 py-2 transition hover:bg-white/20"
        >
          Switch profile
        </button>
      </form>
    </main>
  );
}
