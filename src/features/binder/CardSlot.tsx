import Image from "next/image";
import Link from "next/link";
import type { BinderCard } from "@/lib/types";

/** Owned card thumbnail (tappable → detail) or a locked silhouette.
 *  In `admin` mode: no play link; shows name + an admin-only source link for
 *  fact-checking (U4-FR5, U4-FR9). */
export function CardSlot({
  entry,
  admin = false,
}: {
  entry: BinderCard;
  admin?: boolean;
}) {
  if (!entry.owned) {
    return (
      <div
        data-testid={`card-locked-${entry.card.id}`}
        aria-label="Not collected yet"
        className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/20 text-3xl opacity-45"
      >
        ❔
      </div>
    );
  }

  const thumb = (
    <>
      {entry.count > 1 ? (
        <span className="absolute right-1 top-1 z-10 rounded-full bg-black/70 px-1.5 text-xs font-bold">
          x{entry.count}
        </span>
      ) : null}
      <Image
        src={entry.card.imageUrl}
        alt={entry.card.name}
        width={256}
        height={256}
        loading="lazy"
        className="aspect-square w-full object-cover"
      />
    </>
  );

  if (admin) {
    return (
      <div
        data-testid={`admin-card-${entry.card.id}`}
        className="flex flex-col gap-1"
      >
        <div className="relative overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-[var(--shadow-soft)]">
          {thumb}
        </div>
        <span className="truncate text-xs font-semibold">{entry.card.name}</span>
        {entry.card.sourceUrl ? (
          <a
            href={entry.card.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`card-source-${entry.card.id}`}
            className="link-soft truncate text-[0.7rem]"
          >
            🔗 Source
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <Link
      href={`/play/binder/${entry.card.id}`}
      data-testid={`card-slot-${entry.card.id}`}
      className="slot-pop relative block overflow-hidden rounded-xl border border-white/15 bg-white/10 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:scale-105 hover:border-white/40"
    >
      {thumb}
    </Link>
  );
}
