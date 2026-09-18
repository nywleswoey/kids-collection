import type { Rarity } from "@/lib/types";

/**
 * Shared class tail for a rarity-framed card slot (colored frame + glow + hover
 * lift). Consumed by binder CardSlot (a Link) and admin AdminCardSlot (a button),
 * which each prepend element-specific classes (e.g. `slot-pop block`).
 * Callers must also import `./rarity-slot.css` for the frame styling.
 *
 * `aspect-square` is load-bearing, not decoration: slots are grid items, so a
 * taller sibling stretches the whole row. Without it the frame grew with the row
 * while the artwork kept its own square size, and the grid visibly staggered on
 * Android Chrome at >=130% text scaling. Pair it with the absolutely-filling
 * image in RarityThumb — together they make the art track the frame exactly.
 */
export function raritySlotClass(rarity: Rarity): string {
  return `rslot rslot--${rarity} relative aspect-square overflow-hidden rounded-xl bg-white/10 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:scale-105`;
}
