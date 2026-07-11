import Link from "next/link";
import { requireParent } from "@/features/auth/guard";
import { requireAdminGate } from "@/features/admin/gate";
import { getCatalogPreview } from "@/features/admin/catalog";
import { ThemeSection } from "@/features/binder/ThemeSection";
import { EffectTriggerPanel } from "@/features/admin/EffectTriggerPanel";
import { SoundProvider } from "@/features/sound/SoundProvider";
import { SoundControls } from "@/features/sound/SoundControls";

/**
 * Admin preview (U4-FR2/FR3): the full pool shown as a completed binder with
 * admin-only source links, plus a panel to trigger every effect. Read-only —
 * never touches any child's collection. Wrapped in its own SoundProvider so the
 * effects work off the play layout.
 */
export default async function AdminPreviewPage() {
  await requireParent();
  await requireAdminGate();

  const catalog = await getCatalogPreview();
  const sampleCard = catalog.themes[0]?.cards[0]?.card ?? null;

  return (
    <SoundProvider>
      <main
        className="mx-auto flex max-w-3xl flex-col gap-6 p-6"
        data-testid="admin-preview"
      >
        <header className="panel flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold">🔭 Pool Preview</h1>
            <p className="text-sm text-[color:var(--ink-mute)]">
              {catalog.totalCards} cards · source links for fact-checking (admin only)
            </p>
          </div>
          <Link href="/admin" className="btn btn--ghost text-sm">
            ← Admin
          </Link>
        </header>

        <EffectTriggerPanel sampleCard={sampleCard} />

        {catalog.themes.map((section) => (
          <ThemeSection key={section.theme.id} section={section} admin />
        ))}
      </main>
      <SoundControls />
    </SoundProvider>
  );
}
