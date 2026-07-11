/**
 * Pure ticket-display helpers (Inc10 FR1/FR2). No I/O — property-tested.
 */

/** Show the "ask your parent" prompt only when the child has NO ticket of any
 * kind (normal, epic, or lucky). Inc10 FR2 / B1=A. */
export function shouldShowAskParent(
  balance: number,
  epic: number,
  lucky: number,
): boolean {
  return balance <= 0 && epic <= 0 && lucky <= 0;
}

/** Total special-egg tickets (epic + lucky) for the combined landing pill
 * (Inc10 FR1 / A1=C). Negatives clamped to 0. */
export function specialTicketTotal(epic: number, lucky: number): number {
  return Math.max(0, epic) + Math.max(0, lucky);
}
