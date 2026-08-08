"use client";

import posthog from "posthog-js";
import { useState, useTransition } from "react";
import Link from "next/link";
import { startQuizAction, submitQuizAction } from "./actions";
import type { ClientQuestion, Lesson, QuizOutcome } from "./types";
import { useSound } from "@/features/sound/useSound";
import { Confetti } from "@/features/anim/Confetti";
import { BarModel } from "./BarModel";

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
  const [answered, setAnswered] = useState<string | null>(null); // Inc13 FR6
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
      setAnswered(null);
      setPhase("quiz");
      posthog.capture("quiz_started", { topic_id: topicId });
    });
  }

  // Inc13 FR6: lock in the answer + show immediate feedback (no advance yet).
  function choose(option: string) {
    if (answered !== null) return; // one shot per question
    const correct = option === questions[idx].correct;
    play(correct ? "tokenChime" : "denied");
    const nextPicks = [...picks];
    nextPicks[idx] = option;
    setPicks(nextPicks);
    setAnswered(option);
  }

  // Advance to the next question, or submit after the last one.
  function next() {
    play("click");
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
      setAnswered(null);
      return;
    }
    startTransition(async () => {
      const res = await submitQuizAction(offer, picks);
      setOutcome(res);
      setPhase("result");
      posthog.capture("quiz_completed", {
        topic_id: topicId,
        passed: res.passed,
        correct_count: res.correct,
        total_questions: res.total,
        awarded_ticket: !!res.awarded,
      });
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
    const isCorrect = answered === q.correct;
    const isLast = idx + 1 >= questions.length;
    return (
      <div className="panel flex max-w-md flex-col items-center gap-5 p-6 text-center" data-testid="quiz-question">
        <span className="pill pill--gold">
          Question {idx + 1} of {questions.length}
        </span>
        {/* Inc25 FR14: fractions are the only topic that ships a picture. The
            answers stay text buttons below, so only the prompt area grows. */}
        {q.visual ? <BarModel parts={q.visual.parts} shaded={q.visual.shaded} /> : null}
        <p className="text-2xl font-bold">{q.prompt}</p>
        <div className="flex w-full flex-col gap-3">
          {q.options.map((opt) => {
            // Inc13 FR6: after answering, mark the correct option green and a
            // wrong pick red; lock all buttons.
            let state = "";
            if (answered !== null) {
              if (opt === q.correct)
                state = "ring-2 ring-green-400 bg-green-500/20";
              else if (opt === answered)
                state = "ring-2 ring-red-400 bg-red-500/20";
            }
            return (
              <button
                key={opt}
                type="button"
                onClick={() => choose(opt)}
                disabled={answered !== null || pending}
                data-testid={`quiz-option-${opt}`}
                className={`btn btn--ghost btn--lg press ${state}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {answered !== null ? (
          <div
            className="flex w-full flex-col items-center gap-3"
            data-testid="quiz-feedback"
          >
            {isCorrect ? (
              <p className="pill pill--gold" data-testid="quiz-feedback-correct">
                ✅ Correct!
              </p>
            ) : (
              <p className="pill" data-testid="quiz-feedback-wrong">
                ❌ Not quite — the answer is <strong>{q.correct}</strong>
              </p>
            )}
            <p className="text-sm text-[color:var(--ink-soft)]" data-testid="quiz-explanation">
              💡 {q.explanation}
            </p>
            <button
              type="button"
              onClick={next}
              disabled={pending}
              data-testid="quiz-next"
              className="btn btn--primary btn--lg press font-bold"
            >
              {pending ? "Checking…" : isLast ? "See results 🎉" : "Next →"}
            </button>
          </div>
        ) : null}
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
              You earned an Easter Egg ticket! 🥚 +1
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
