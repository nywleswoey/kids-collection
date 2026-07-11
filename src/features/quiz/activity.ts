import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { quizCompletions } from "@/db/schema";
import { getTopic } from "./topics";
import { sgtDayKey } from "./cap";

export interface QuizActivityRow {
  topic: string;
  title: string;
  correct: number;
  total: number;
  passed: boolean;
  awarded: boolean;
  at: string; // ISO
}

export interface QuizActivity {
  recent: QuizActivityRow[];
  earnedToday: number;
  earnedAllTime: number;
}

/** Quiz activity for the admin view (Inc11 FR8). */
export async function getQuizActivity(
  childId: string,
  nowMs: number = Date.now(),
): Promise<QuizActivity> {
  const rows = await db
    .select()
    .from(quizCompletions)
    .where(eq(quizCompletions.childId, childId))
    .orderBy(desc(quizCompletions.createdAt))
    .limit(50);

  const today = sgtDayKey(nowMs);
  let earnedToday = 0;
  let earnedAllTime = 0;
  for (const r of rows) {
    if (r.awarded) {
      earnedAllTime++;
      if (sgtDayKey(r.createdAt.getTime()) === today) earnedToday++;
    }
  }

  const recent: QuizActivityRow[] = rows.slice(0, 8).map((r) => ({
    topic: r.topic,
    title: getTopic(r.topic)?.title ?? r.topic,
    correct: r.correct,
    total: r.total,
    passed: r.passed,
    awarded: r.awarded,
    at: r.createdAt.toISOString(),
  }));

  return { recent, earnedToday, earnedAllTime };
}

/** Which topics the child has already been awarded for today (SGT) — for the
 * picker to show "earned today" (FR2). */
export async function topicsAwardedToday(
  childId: string,
  nowMs: number = Date.now(),
): Promise<Set<string>> {
  const rows = await db
    .select({ topic: quizCompletions.topic, awarded: quizCompletions.awarded, createdAt: quizCompletions.createdAt })
    .from(quizCompletions)
    .where(eq(quizCompletions.childId, childId));
  const today = sgtDayKey(nowMs);
  const set = new Set<string>();
  for (const r of rows) {
    if (r.awarded && sgtDayKey(r.createdAt.getTime()) === today) set.add(r.topic);
  }
  return set;
}
