/** Pure cap logic (Inc11 FR7). No I/O — property-tested. */

import { DAILY_TICKET_CAP, type AwardReason } from "./types";

const SGT_OFFSET_MS = 8 * 60 * 60 * 1000; // Singapore = UTC+8, no DST
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Integer key for the SGT calendar day containing `nowMs`. Two instants share
 * a key iff they fall on the same Singapore date. Used to bucket completions.
 */
export function sgtDayKey(nowMs: number): number {
  return Math.floor((nowMs + SGT_OFFSET_MS) / DAY_MS);
}

/**
 * Decide whether a passing attempt earns an Easter Egg ticket (FR7; Inc19).
 * - Must have passed.
 * - Per-topic/day (Q4=B): the topic must not already be awarded today.
 * - Global/day (D6=D): fewer than DAILY_TICKET_CAP awarded today.
 */
export function decideAward(
  passed: boolean,
  awardedTodayGlobal: number,
  topicAwardedToday: boolean,
): { award: boolean; reason: AwardReason } {
  if (!passed) return { award: false, reason: "failed" };
  if (topicAwardedToday) return { award: false, reason: "topic-done" };
  if (awardedTodayGlobal >= DAILY_TICKET_CAP)
    return { award: false, reason: "daily-cap" };
  return { award: true, reason: "ok" };
}
