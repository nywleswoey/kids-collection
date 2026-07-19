import Link from "next/link";
import { AvatarBadge } from "@/features/ui/AvatarBadge";
import { ProgressBar } from "@/features/binder/ProgressBar";
import { GrantControl } from "./GrantControl";
import type { AdminChildRow as Row } from "@/lib/types";
import type { QuizActivity } from "@/features/quiz/activity";

export function ChildAdminRow({ row, quiz }: { row: Row; quiz?: QuizActivity }) {
  const { child } = row;
  return (
    <li
      data-testid={`admin-child-${child.id}`}
      className="panel flex flex-col gap-3 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <AvatarBadge avatar={child.avatar} className="h-12 w-12 text-2xl" />
          <div className="flex flex-col">
            <span className="font-semibold">{child.name}</span>
            <ProgressBar
              themeId={child.id}
              owned={row.owned}
              total={row.total}
              complete={row.total > 0 && row.owned === row.total}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <GrantControl
            childId={child.id}
            initialBalance={row.balance}
            initialEpic={row.epicTickets}
            initialLucky={row.luckyTickets}
            initialPicks={child.pickTickets}
          />
          <Link
            href={`/admin/child/${child.id}/binder`}
            data-testid={`admin-binder-${child.id}`}
            className="btn btn--ghost text-sm"
          >
            Binder
          </Link>
        </div>
      </div>

      {quiz ? (
        <div
          data-testid={`admin-quiz-${child.id}`}
          className="rounded-lg bg-white/5 p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[color:var(--ink-soft)]">
            <span className="font-semibold text-[color:var(--ink)]">
              🧠 Quizzes
            </span>
            <span data-testid={`admin-quiz-today-${child.id}`}>
              🍀 today: {quiz.earnedToday}/3
            </span>
            <span>all-time: {quiz.earnedAllTime}</span>
          </div>
          {quiz.recent.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1 text-[color:var(--ink-soft)]">
              {quiz.recent.map((r, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{r.passed ? "✅" : "❌"}</span>
                  <span className="truncate">{r.title}</span>
                  <span className="opacity-70">
                    {r.correct}/{r.total}
                  </span>
                  {r.awarded ? <span>🍀</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[color:var(--ink-mute)]">No quizzes yet.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
