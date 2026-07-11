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
    <main
      className="mx-auto flex max-w-3xl flex-col gap-6 p-6"
      data-testid="binder-page"
    >
      <header className="panel sticky top-3 z-10 flex flex-wrap items-center justify-between gap-3 p-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/play/home"
            data-testid="binder-back-home"
            className="btn btn--ghost text-sm"
          >
            ← Home
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="title-pop">{child.name}</span>&apos;s Galaxy
          </h1>
        </div>
        <span className="pill pill--gold">
          ⭐ {binder.totalOwned} / {binder.totalCards} stars
        </span>
      </header>

      {binder.totalOwned === 0 ? (
        <div
          data-testid="binder-empty"
          className="panel flex flex-col items-center gap-4 p-10 text-center"
        >
          <div className="text-6xl float" aria-hidden>
            🪐
          </div>
          <p className="display text-lg">
            Your galaxy is empty — go discover your first card! ✨
          </p>
          <Link href="/play/pull" className="btn btn--primary btn--lg">
            🚀 Discover a card
          </Link>
        </div>
      ) : (
        binder.themes.map((section) => (
          <ThemeSection key={section.theme.id} section={section} />
        ))
      )}
    </main>
  );
}
