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
      <p className="text-sm opacity-60">
        Pulling and your binder arrive in the next units.
      </p>
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
