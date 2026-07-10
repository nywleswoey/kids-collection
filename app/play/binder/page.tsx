import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParent } from "@/features/auth/guard";
import { getActiveChild } from "@/features/profiles/active-profile";
import { getBinder } from "@/features/binder/service";
import { ThemeSection } from "@/features/binder/ThemeSection";

export default async function BinderPage() {
  await requireParent();
  const child = await getActiveChild();
  if (!child) redirect("/play");

  const binder = await getBinder(child.id);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6" data-testid="binder-page">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{child.name}&apos;s Binder</h1>
        <span className="text-sm opacity-80">
          {binder.totalOwned} / {binder.totalCards} cards
        </span>
      </header>

      {binder.totalOwned === 0 ? (
        <div
          data-testid="binder-empty"
          className="flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-8 text-center"
        >
          <p className="text-lg">No cards yet — go pull your first! ✨</p>
          <Link
            href="/play/pull"
            className="rounded-xl bg-gradient-to-br from-amber-300 to-pink-400 px-5 py-2 font-bold text-gray-900"
          >
            Pull a card
          </Link>
        </div>
      ) : (
        binder.themes.map((section) => (
          <ThemeSection key={section.theme.id} section={section} />
        ))
      )}

      <Link href="/play/home" className="text-sm underline opacity-80">
        ← Home
      </Link>
    </main>
  );
}
