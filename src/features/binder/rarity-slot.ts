import type { Rarity } from "@/lib/types";

/**
 * Shared class tail for a rarity-framed card slot (colored frame + glow + hover
 * lift). Consumed by binder CardSlot (a Link) and admin AdminCardSlot (a button),
 * which each prepend element-specific classes (e.g. `slot-pop block`).
 * Callers must also import `./rarity-slot.css` for the frame styling.
 */
export function raritySlotClass(rarity: Rarity): string {
  return `rslot rslot--${rarity} relative overflow-hidden rounded-xl bg-white/10 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:scale-105`;
}
