import Image from "next/image";
import type { Card } from "@/lib/types";

const RARITY_STYLE: Record<Card["rarity"], string> = {
  common: "ring-gray-400",
  rare: "ring-blue-400",
  epic: "ring-purple-400",
  legendary: "ring-amber-400",
};

/**
 * Minimal card display + duplicate badge. Placeholder — U6 replaces this
 * with the full holographic/3D/reveal CardRenderer.
 */
export function PullResultView({
  card,
  isDuplicate,
}: {
  card: Card;
  isDuplicate: boolean;
}) {
  return (
    <div
      className={`relative flex w-56 flex-col gap-2 rounded-2xl bg-white/10 p-3 ring-4 ${RARITY_STYLE[card.rarity]}`}
      data-testid="pull-result"
    >
      {isDuplicate ? (
        <span
          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs"
          data-testid="duplicate-badge"
        >
          Duplicate
        </span>
      ) : null}
      <Image
        src={card.imageUrl}
        alt={card.name}
        width={512}
        height={512}
        className="aspect-square w-full rounded-xl object-cover"
      />
      <div className="flex items-center justify-between">
        <span className="font-bold">{card.name}</span>
        <span className="text-xs uppercase opacity-70">{card.rarity}</span>
      </div>
      <p className="text-sm opacity-80">{card.eduText}</p>
    </div>
  );
}
