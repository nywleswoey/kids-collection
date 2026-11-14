import type { Rarity } from "@/lib/types";

/** Where a ticket-given event came from — see ticket-grant-store.ts and
 *  quiz_completions.awarded for the two underlying sources. */
export type TicketGivenSource = "admin" | "sacrifice" | "quiz";

interface ActivityEventBase {
  /** The child whose log this event belongs to (both sides of a trade get
   *  their own copy, framed from their own perspective). */
  childId: string;
  childName: string;
  /** ISO timestamp — every event shows one (#kcact). */
  at: string;
}

export interface TicketGivenEvent extends ActivityEventBase {
  type: "ticket_given";
  ticket: "pullTokens" | "easterEggTickets";
  amount: number;
  source: TicketGivenSource;
  /** Parent display name/email for an admin grant; the quiz topic title for a
   *  quiz grant; null for sacrifice (the child triggers it on themselves). */
  detail: string | null;
}

export interface CardReceivedEvent extends ActivityEventBase {
  type: "card_received";
  via: "pull" | "easter_egg";
  /** Which balance was spent — an easter egg can cost either (a random egg
   *  from a normal pull spends a pull token); null for a legacy egg row that
   *  didn't record it. */
  spent: "pullTokens" | "easterEggTickets" | null;
  cardId: string;
  cardName: string;
  rarity: Rarity;
  isDuplicate: boolean;
}

export interface BonusCardEvent extends ActivityEventBase {
  type: "bonus_card";
  cardId: string;
  cardName: string;
  rarity: Rarity;
  themeId: string;
}

export interface TradeEvent extends ActivityEventBase {
  type: "trade";
  gaveCardId: string;
  gaveCardName: string;
  gotCardId: string;
  gotCardName: string;
  withChildId: string;
  withChildName: string;
}

export type ActivityEvent = TicketGivenEvent | CardReceivedEvent | BonusCardEvent | TradeEvent;

export type ActivityEventType = ActivityEvent["type"];

/** One entry per `ActivityEventType`, in list order — the type filter's
 *  options (#kcactfilter). Icon matches the most common `describe()` icon for
 *  that type (admin grant / pull / bonus / trade) since a type's icon can
 *  otherwise vary by subtype. */
export const ACTIVITY_EVENT_TYPES: Array<{ type: ActivityEventType; label: string; icon: string }> = [
  { type: "ticket_given", label: "Tickets given", icon: "🎁" },
  { type: "card_received", label: "Cards received", icon: "🎟️" },
  { type: "bonus_card", label: "Bonus cards", icon: "🏆" },
  { type: "trade", label: "Trades", icon: "🔄" },
];
