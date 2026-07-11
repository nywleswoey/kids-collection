"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { startQuizAction, submitQuizAction } from "./actions";
import type { ClientQuestion, Lesson, QuizOutcome } from "./types";
import { useSound } from "@/features/sound/useSound";
import { Confetti } from "@/features/anim/Confetti";

type Phase = "lesson" | "quiz" | "result";

export function QuizFlow({
  topicId,
  title,
  lesson,
}: {
  topicId: string;
  title: string;
  lesson: Lesson;
}) {
  const [phase, setPhase] = useState<Phase>("lesson");
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [offer, setOffer] = useState("");
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [burst, setBurst] = useState(0);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();

  function begin() {
    play("click");
    startTransition(async () => {
      const quiz = await startQuizAction(topicId);
      setQuestions(quiz.questions);
      setOffer(quiz.offer);
      setPicks([]);
      setIdx(0);
      setPhase("quiz");
    });
  }

  function choose(option: string) {
    play("click");
    const nextPicks = [...picks];
    nextPicks[idx] = option;
    setPicks(nextPicks);

    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      return;
    }
    // Last question → submit.
    startTransition(async () => {
      const res = await submitQuizAction(offer, nextPicks);
      setOutcome(res);
      setPhase("result");
      if (res.awarded) {
        play("setComplete");
        setBurst((n) => n + 1);
      } else if (res.passed) {
        play("tokenChime");
      } else {
        play("denied");
      }
    });
  }

  if (phase === "lesson") {
    return (
      <div className="panel flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold title-pop">{title}</h1>
        <p className="text-[color:var(--ink)]">{lesson.intro}</p>
        <p className="pill">💡 {lesson.example}</p>
        <button
          type="button"
          onClick={begin}
          disabled={pending}
          data-testid="start-quiz"
          className="btn btn--primary btn--lg press font-extrabold"
        >
          {pending ? "Getting ready…" : "Start Quiz 🚀"}
        </button>
        <Link href="/play/learn" className="btn btn--ghost text-sm">
          ← Back
        </Link>
      </div>
    );
  }

  if (phase === "quiz") {
    const q = questions[idx];
    if (!q) return null;
    return (
      <div className="panel flex max-w-md flex-col items-center gap-5 p-6 text-center" data-testid="quiz-question">
        <span className="pill pill--gold">
          Question {idx + 1} of {questions.length}
        </span>
        <p className="text-2xl font-bold">{q.prompt}</p>
        <div className="flex w-full flex-col gap-3">
          {q.options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => choose(opt)}
              disabled={pending}
              data-testid={`quiz-option-${opt}`}
              className="btn btn--ghost btn--lg press"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // result
  const o = outcome!;
  return (
    <div className="panel flex max-w-md flex-col items-center gap-4 p-6 text-center" data-testid="quiz-result">
      <Confetti fire={burst} count={70} />
      {o.passed ? (
        <>
          <h1 className="text-3xl font-bold title-pop">All correct! 🎉</h1>
          {o.awarded ? (
            <p className="pill pill--gold" data-testid="quiz-awarded">
              You earned a Lucky ticket! 🍀 +1
            </p>
          ) : o.reason === "topic-done" ? (
            <p className="pill">You already earned this one today — great job! 🌟</p>
          ) : (
            <p className="pill">Great job! Come back tomorrow for more tickets 🌙</p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold">Not quite! 🌟</h1>
          <p className="text-[color:var(--ink)]">
            You got {o.correct} of {o.total} right. Review the lesson and try again later.
          </p>
        </>
      )}
      <div className="flex gap-3">
        <Link href="/play/learn" className="btn btn--primary" data-testid="quiz-back-picker">
          🧠 More quizzes
        </Link>
        <Link href="/play/home" className="btn btn--ghost">
          🏠 Home
        </Link>
      </div>
    </div>
  );
}
