import { redirect } from "next/navigation";
import { requireActivePlayer } from "@/features/profiles/active-profile";
import { getTopic } from "@/features/quiz/topics";
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

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center p-8"
      data-testid="quiz-screen"
    >
      <QuizFlow topicId={topic.id} title={topic.title} lesson={topic.lesson} />
    </main>
  );
}
