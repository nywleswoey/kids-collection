import type { BinderCard } from "@/lib/types";

/**
 * Locked card silhouette: neutral hint only (U5-Q5) — no rarity frame, no glow,
 * no badge — but shows the name (U6-FR1). Shared by play's binder grid and
 * admin's preview grid so both render an unowned slot identically.
 *
 * The TILE's height comes from its CONTENT (a glyph plus a two-line name), and
 * slots are grid items, so content that outgrows the square stretches every
 * sibling in the row. `overflow-hidden` zeroes its automatic minimum size so
 * `aspect-square` wins and the excess clips instead; `leading-none` on the
 * glyph buys back the headroom that made this reachable (at 360px the content
 * was 80px inside an 82px box, so Android Chrome's 130% text scaling was
 * enough to break the grid).
 */
export function LockedSlot({ entry }: { entry: BinderCard }) {
  return (
    <div
      data-testid={`card-locked-${entry.card.id}`}
      aria-label={`Not collected yet: ${entry.card.name}`}
      className="flex aspect-square flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-dashed border-white/15 bg-black/20 p-1 text-center"
    >
      <span className="text-3xl leading-none opacity-45" aria-hidden>
        ❔
      </span>
      <span className="line-clamp-2 text-[0.65rem] font-semibold leading-tight text-[color:var(--ink-mute)]">
        {entry.card.name}
      </span>
    </div>
  );
}
