import Link from "next/link";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { TOPICS } from "@/features/quiz/topics";
import { quizService } from "@/features/quiz/quiz-service.prod";
import type { QuizSubject } from "@/features/quiz/types";

const GROUPS: { subject: QuizSubject; label: string; emoji: string }[] = [
  { subject: "math", label: "Maths", emoji: "🔢" },
  { subject: "grammar", label: "English Grammar", emoji: "📖" },
];

export default async function LearnPage() {
  const child = await requireActivePlayer();

  const done = await quizService.topicsAwardedToday(child.id);

  return (
    <main
      className="flex min-h-screen flex-col items-center gap-8 p-8"
      data-testid="learn-picker"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="pill pill--gold">🧠 Play &amp; Learn</span>
        <h1 className="text-3xl font-bold">
          Pass a quiz, earn a Lucky ticket! 🍀
        </h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Learn a little, then answer all 5 correctly.
        </p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.subject} className="flex w-full max-w-md flex-col gap-3">
          <h2 className="text-lg font-bold">
            {g.emoji} {g.label}
          </h2>
          {TOPICS.filter((t) => t.subject === g.subject).map((t) => (
            <Link
              key={t.id}
              href={`/play/learn/${t.id}`}
              data-testid={`topic-${t.id}`}
              className="btn btn--ghost btn--lg flex items-center justify-between"
            >
              <span>{t.title}</span>
              {done.has(t.id) ? <span title="Earned today">✓ 🍀</span> : null}
            </Link>
          ))}
        </section>
      ))}

      <Link href="/play/home" className="btn btn--ghost">
        🏠 Home
      </Link>
    </main>
  );
}
