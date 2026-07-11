import Image from "next/image";
import Link from "next/link";
import type { BinderCard } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import { AdminCardSlot } from "@/features/admin/AdminCardSlot";
import "./rarity-slot.css";

/** Owned card thumbnail (tappable → detail) or a locked silhouette.
 *  Owned slots show rarity via a colored frame + glow + corner badge (U5-FR2).
 *  In `admin` mode the slot is clickable to expand (AdminCardSlot). */
export function CardSlot({
  entry,
  admin = false,
}: {
  entry: BinderCard;
  admin?: boolean;
}) {
  if (!entry.owned) {
    // Locked stays neutral — no rarity hint (U5-Q5) — but shows the name (U6-FR1).
    return (
      <div
        data-testid={`card-locked-${entry.card.id}`}
        aria-label={`Not collected yet: ${entry.card.name}`}
        className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 bg-black/20 p-1 text-center"
      >
        <span className="text-3xl opacity-45" aria-hidden>
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

  const meta = RARITY_META[entry.card.rarity];

  return (
    <Link
      href={`/play/binder/${entry.card.id}`}
      data-testid={`card-slot-${entry.card.id}`}
      className={`slot-pop rslot rslot--${entry.card.rarity} relative block overflow-hidden rounded-xl bg-white/10 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:scale-105`}
    >
      {entry.count > 1 ? (
        <span className="absolute right-1 top-1 z-10 rounded-full bg-black/70 px-1.5 text-xs font-bold">
          x{entry.count}
        </span>
      ) : null}
      <span className="rarity-badge">{meta.label}</span>
      <Image
        src={entry.card.imageUrl}
        alt={entry.card.name}
        width={256}
        height={256}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
    </Link>
  );
}
