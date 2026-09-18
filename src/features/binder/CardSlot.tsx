import Link from "next/link";
import type { BinderCard } from "@/lib/types";
import { RarityThumb } from "@/features/card/RarityThumb";
import { LockedSlot } from "@/features/card/LockedSlot";
import { raritySlotClass } from "./rarity-slot";
import { cardHref, type Place } from "./binder-place";
import "./rarity-slot.css";

/** Owned card thumbnail (tappable → detail) or a locked silhouette (U5-FR2).
 *  Admin's own slot (AdminCardSlot) composes itself over the pool grid instead
 *  of being asked for here — see ThemeSection's `renderCard`. */
export function CardSlot({
  entry,
  from,
}: {
  entry: BinderCard;
  /** The place this slot was tapped from, so card detail can send the child
   *  back there rather than to the hub (#108). */
  from?: Place;
}) {
  if (!entry.owned) {
    // Locked stays neutral — no rarity hint (U5-Q5) — but shows the name (U6-FR1).
    // Since #123 the grid is ordered by rarity, so a locked slot's POSITION does
    // carry what its decoration withholds — the last two `❔` of a category are
    // its legendaries. Deliberate, not an oversight: see `card-order.ts` for why
    // that cost was taken.
    return <LockedSlot entry={entry} />;
  }

  return (
    <Link
      href={from ? cardHref(entry.card.id, from) : `/play/binder/${entry.card.id}`}
      data-testid={`card-slot-${entry.card.id}`}
      className={`slot-pop block ${raritySlotClass(entry.card.rarity)}`}
    >
      <RarityThumb entry={entry} countClassName="badge-count absolute right-1 top-1" />
    </Link>
  );
}
