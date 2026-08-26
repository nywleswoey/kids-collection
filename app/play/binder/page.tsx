import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { binderService } from "@/features/binder/service.prod";
import { GalaxyView } from "@/features/binder/GalaxyView";
import { rewardService } from "@/features/rewards/service.prod";
import { CollectionRewardModal } from "@/features/rewards/CollectionRewardModal";

export default async function BinderPage() {
  const child = await requireActivePlayer();

  const [binder, pendingRewards] = await Promise.all([
    binderService.getBinder(child.id),
    rewardService.getPendingRewards(child.id),
  ]);

  return (
    <main
      className="mx-auto flex max-w-3xl flex-col gap-6 p-6"
      data-testid="binder-page"
    >
      <CollectionRewardModal rewards={pendingRewards} />
      <header
        // Pinned only from `sm:` up, and `sm:flex-nowrap` there is what makes
        // that safe: galaxy-tabs pins to a fixed offset below this header, so
        // the header's height has to be a constant, not a function of the
        // child's name. Names run to 40 chars (profiles/service.ts), which
        // wrapped this to two rows (155px) and buried the tab bar underneath
        // it. Nowrap + a truncating title holds it at one row (88px).
        // On a phone it still wraps, which is fine -- it is not pinned there,
        // because pinning 155px of header plus the tab bar would park a
        // quarter of the viewport permanently.
        className="panel z-10 flex flex-wrap items-center justify-between gap-3 p-5 sm:sticky sm:top-3 sm:flex-nowrap"
        style={{ background: "var(--bg-1)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/play/home"
            data-testid="binder-back-home"
            className="btn btn--ghost shrink-0 text-sm"
          >
            ← Home
          </Link>
          <h1 className="truncate text-2xl font-bold">
            <span className="title-pop">{child.name}</span>&apos;s Galaxy
          </h1>
        </div>
        <span className="pill pill--gold shrink-0">
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
        <GalaxyView sections={binder.themes} />
      )}
    </main>
  );
}
