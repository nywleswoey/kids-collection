import Link from "next/link";
import type { BinderCard } from "@/lib/types";
import { RarityThumb } from "@/features/card/RarityThumb";
import { SACRIFICE_COST, SACRIFICE_MIN } from "@/features/pull/sacrifice";
import { raritySlotClass } from "./rarity-slot";
import { BURN, cardHref } from "./binder-place";
import "./rarity-slot.css";

/**
 * Flat grid of the cards a child can sacrifice (Inc22 FR12–FR15). No theme
 * headers — burnable piles are rare, so grouping them by category is noise.
 * Each tile deep-links to the card detail page, which is where the sacrifice
 * actually happens (SacrificePanel), so this view is a finder, not an action.
 *
 * #108: the tiles carry `?from=burn`, because this screen is a loop — burn one,
 * come back, burn the next — and before that the way back landed on the hub,
 * two taps from the pile the child was working through. The heading moved to
 * the sticky place bar above, which names the pile and counts it.
 */
export function SacrificeGrid({ cards }: { cards: BinderCard[] }) {
  if (cards.length === 0) {
    return (
      <div
        data-testid="sacrifice-empty"
        className="panel flex flex-col items-center gap-2 p-8 text-center"
      >
        <div className="text-5xl" aria-hidden>
          🔥
        </div>
        <p className="display text-lg">Nothing to sacrifice yet!</p>
        <p className="text-sm text-[color:var(--ink-soft)]">
          You need {SACRIFICE_MIN} copies of the same card — {SACRIFICE_COST} to burn, 1 to keep.
          Keep discovering! 🚀
        </p>
      </div>
    );
  }

  return (
    <section data-testid="sacrifice-grid" className="panel flex flex-col gap-4 p-5">
      <p className="text-sm text-[color:var(--ink-soft)]">
        Tap a card to burn {SACRIFICE_COST} copies for an Easter Egg ticket 🥚 — you always keep 1.
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {cards.map((entry) => (
          <Link
            key={entry.card.id}
            href={cardHref(entry.card.id, BURN)}
            data-testid={`sacrifice-card-${entry.card.id}`}
            className={`slot-pop relative block ${raritySlotClass(entry.card.rarity)}`}
          >
            <span
              aria-label="Ready to sacrifice"
              className="absolute left-1 top-1 z-10 rounded-full bg-[#f97316] px-1.5 py-0.5 text-[0.7rem] font-black leading-none text-black shadow"
            >
              🔥
            </span>
            <RarityThumb entry={entry} countClassName="badge-count absolute right-1 top-1" />
          </Link>
        ))}
      </div>
    </section>
  );
}
