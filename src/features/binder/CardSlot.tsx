import Image from "next/image";
import Link from "next/link";
import type { BinderCard } from "@/lib/types";

/** Owned card thumbnail (tappable → detail) or a locked silhouette. */
export function CardSlot({ entry }: { entry: BinderCard }) {
  if (!entry.owned) {
    return (
      <div
        data-testid={`card-locked-${entry.card.id}`}
        aria-label="Not collected yet"
        className="flex aspect-square items-center justify-center rounded-xl bg-white/5 text-3xl opacity-40"
      >
        ❔
      </div>
    );
  }

  return (
    <Link
      href={`/play/binder/${entry.card.id}`}
      data-testid={`card-slot-${entry.card.id}`}
      className="relative block overflow-hidden rounded-xl bg-white/10 transition hover:scale-105"
    >
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
    </Link>
  );
}
