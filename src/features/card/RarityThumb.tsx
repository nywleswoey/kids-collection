import type { BinderCard } from "@/lib/types";
import { CardImage } from "@/features/card/CardImage";
import { RARITY_META } from "@/features/card/rarity";
import "@/features/binder/rarity-slot.css";

/** Shared inner content for an owned rarity-framed slot (U5-FR2): an optional
 *  copy-count badge, the rarity corner badge, and the lazy 256px thumbnail.
 *  Rendered inside a rarity-framed wrapper (Link or button) by the caller, which
 *  supplies the count badge's className (styling differs between binder/admin).
 *
 *  The thumbnail fills the wrapper absolutely rather than sizing itself from its
 *  own aspect ratio, so it stays flush with the rarity frame even if the grid row
 *  stretches. Every wrapper is `relative aspect-square overflow-hidden`
 *  (raritySlotClass), which is what gives the absolute image its box. */
export function RarityThumb({
  entry,
  countClassName,
}: {
  entry: BinderCard;
  countClassName: string;
}) {
  const meta = RARITY_META[entry.card.rarity];
  return (
    <>
      {entry.count > 1 ? (
        <span className={countClassName}>x{entry.count}</span>
      ) : null}
      <span className="rarity-badge">{meta.label}</span>
      <CardImage
        src={entry.card.imageUrl}
        alt={entry.card.name}
        dim={256}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </>
  );
}
