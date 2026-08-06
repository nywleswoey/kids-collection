/**
 * The one definition of "typed the name correctly" (Inc23 FR9).
 *
 * Small, but it is the entire security value of the delete dialog, so it lives in
 * one tested place rather than being re-implemented slightly differently by the
 * next component that needs it.
 *
 * Case-SENSITIVE: "ben" does not remove "Ben". The point of the confirmation is
 * deliberateness, and matching case is part of reading what you typed. Surrounding
 * whitespace is forgiven because it is invisible, not because it is careless.
 */
export function namesMatch(typed: string, actual: string): boolean {
  return typed.trim() === actual.trim() && actual.trim().length > 0;
}
