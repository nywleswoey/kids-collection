/**
 * The one definition of "typed the name correctly" (Inc23 FR9).
 *
 * Small, but it is the entire security value of the archive dialog, so it lives in
 * one tested place rather than being re-implemented slightly differently by the
 * next component that needs it.
 *
 * Since #97 the act it guards is reversible — the dialog archives rather than
 * deletes — so this is now about deliberateness alone, which is all it ever
 * actually bought.
 *
 * Case-SENSITIVE: "ben" does not remove "Ben". The point of the confirmation is
 * deliberateness, and matching case is part of reading what you typed. Surrounding
 * whitespace is forgiven because it is invisible, not because it is careless.
 */
export function namesMatch(typed: string, actual: string): boolean {
  return typed.trim() === actual.trim() && actual.trim().length > 0;
}
