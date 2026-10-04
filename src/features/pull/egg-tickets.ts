import type { EasterEggOutcome } from "./pull-service";

/** The child's Easter Egg ticket count after claiming `offer`. Only a ticket
 *  redemption (`pullEasterEgg`, the egg carrying `revealRarity`) spent one; the
 *  random ~1% egg rolled inside `pull()` spent a normal token instead. */
export function eggTicketsAfterClaim(eggs: number, offer: Pick<EasterEggOutcome, "revealRarity">): number {
  return offer.revealRarity !== undefined ? Math.max(0, eggs - 1) : eggs;
}
