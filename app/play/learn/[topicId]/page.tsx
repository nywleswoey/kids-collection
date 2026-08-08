import { redirect } from "next/navigation";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { getTopic } from "@/features/quiz/topics";
import { isTopicOfferedToday } from "@/features/quiz/daily-topics";
import { sgtDayKey } from "@/features/quiz/cap";
import { QuizFlow } from "@/features/quiz/QuizFlow";

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topicId: string }>;
}) {
  const child = await requireActivePlayer();

  const { topicId } = await params;
  const topic = getTopic(topicId);
  if (!topic) redirect("/play/learn");

  // Inc25 FR9: hiding the other seven in the picker is not enforcement — the URL
  // is navigable. This redirect is the friendly half; the actual boundary is in
  // buildQuiz (FR10), because startQuizAction is a Server Action and so a POST
  // endpoint that a page check cannot gate.
  if (!isTopicOfferedToday(child.id, sgtDayKey(Date.now()), topic.id)) redirect("/play/learn");

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="quiz-screen"
    >
      <QuizFlow topicId={topic.id} title={topic.title} lesson={topic.lesson} />
    </main>
  );
}
