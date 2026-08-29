import Link from "next/link";
import type { BinderCard } from "@/lib/types";
import { RarityThumb } from "@/features/card/RarityThumb";
import { AdminCardSlot } from "@/features/admin/AdminCardSlot";
import { raritySlotClass } from "./rarity-slot";
import { cardHref, type Place } from "./binder-place";
import "./rarity-slot.css";

/** Owned card thumbnail (tappable → detail) or a locked silhouette.
 *  Owned slots show rarity via a colored frame + glow + corner badge (U5-FR2).
 *  In `admin` mode the slot is clickable to expand (AdminCardSlot).
 *
 *  The locked tile is the one slot whose height comes from its CONTENT (a glyph
 *  plus a two-line name), and slots are grid items, so content that outgrows the
 *  square stretches every sibling in the row. `overflow-hidden` zeroes its
 *  automatic minimum size so `aspect-square` wins and the excess clips instead;
 *  `leading-none` on the glyph buys back the headroom that made this reachable
 *  (at 360px the content was 80px inside an 82px box, so Android Chrome's 130%
 *  text scaling was enough to break the grid). */
export function CardSlot({
  entry,
  admin = false,
  from,
}: {
  entry: BinderCard;
  admin?: boolean;
  /** The place this slot was tapped from, so card detail can send the child
   *  back there rather than to the hub (#108). */
  from?: Place;
}) {
  if (!entry.owned) {
    // Locked stays neutral — no rarity hint (U5-Q5) — but shows the name (U6-FR1).
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

  if (admin) {
    return <AdminCardSlot entry={entry} />;
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
