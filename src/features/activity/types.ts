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

/** The activity page's type-filter options (#kcactfilter). A `ticket_given`
 *  event splits by `source` into three options, since a parent grant, a quiz
 *  reward and a sacrifice are different kinds of activity to a parent. */
export type ActivityFilter =
  | "ticket_admin"
  | "ticket_quiz"
  | "ticket_sacrifice"
  | "card_received"
  | "bonus_card"
  | "trade";

export function activityFilterOf(event: ActivityEvent): ActivityFilter {
  return event.type === "ticket_given" ? `ticket_${event.source}` : event.type;
}

/** One entry per `ActivityFilter`, in display order. */
export const ACTIVITY_FILTERS: Array<{ filter: ActivityFilter; label: string; icon: string; empty: string }> = [
  { filter: "ticket_admin", label: "Given by parent", icon: "🎁", empty: "No tickets given by a parent yet." },
  { filter: "ticket_quiz", label: "Quizzes", icon: "🧠", empty: "No quiz rewards yet." },
  { filter: "ticket_sacrifice", label: "Sacrifices", icon: "🔥", empty: "No sacrifices yet." },
  { filter: "card_received", label: "Cards received", icon: "🎟️", empty: "No cards received yet." },
  { filter: "bonus_card", label: "Bonus cards", icon: "🏆", empty: "No bonus cards yet." },
  { filter: "trade", label: "Trades", icon: "🔄", empty: "No trades yet." },
];
