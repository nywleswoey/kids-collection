import "server-only";
import { pgQuizStore } from "@/db/stores/quiz-store.pg";
import { pgChildStore } from "@/db/stores/child-store.pg";
import { makeQuizService } from "./quiz-service";

/** Prod-wired quiz service: the factory bound to the pg adapters, once. */
export const quizService = makeQuizService({ quiz: pgQuizStore, children: pgChildStore });
