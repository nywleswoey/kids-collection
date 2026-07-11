/** The 6 quiz topics (Inc11 Q2=B) — titles + authored lessons (Q5=A). Single
 * source of truth for the picker, lesson screens, and question routing. */

import type { Topic } from "./types";

export const TOPICS: Topic[] = [
  {
    id: "add-within-20",
    subject: "math",
    title: "Addition within 20",
    lesson: {
      intro:
        "Adding means putting two groups together to find how many there are altogether. Count on from the bigger number to add quickly.",
      example: "8 + 5: start at 8, then count on 5 more — 9, 10, 11, 12, 13. So 8 + 5 = 13.",
    },
  },
  {
    id: "sub-within-20",
    subject: "math",
    title: "Subtraction within 20",
    lesson: {
      intro:
        "Subtracting means taking some away to find how many are left. You can count back from the bigger number.",
      example: "14 − 6: start at 14 and count back 6 — 13, 12, 11, 10, 9, 8. So 14 − 6 = 8.",
    },
  },
  {
    id: "number-bonds-10",
    subject: "math",
    title: "Number Bonds to 10",
    lesson: {
      intro:
        "Number bonds are two numbers that add up to make 10. They are like best friends — if you know one, you can find the other.",
      example: "If you have 7, you need 3 more to make 10, because 7 + 3 = 10.",
    },
  },
  {
    id: "nouns-vs-verbs",
    subject: "grammar",
    title: "Nouns vs Verbs",
    lesson: {
      intro:
        "A noun is a naming word — a person, animal, place, or thing (like dog, school, ball). A verb is an action word — something we do (like run, eat, jump).",
      example: "In 'The boy kicks the ball', 'boy' and 'ball' are nouns, and 'kicks' is the verb.",
    },
  },
  {
    id: "articles",
    subject: "grammar",
    title: "A, An, The",
    lesson: {
      intro:
        "Use 'a' before a word that starts with a consonant sound (a cat), and 'an' before a vowel sound — a, e, i, o, u (an apple). Use 'the' for one special thing we both know (the sun).",
      example: "an egg, a book, the moon.",
    },
  },
  {
    id: "singular-vs-plural",
    subject: "grammar",
    title: "Singular vs Plural",
    lesson: {
      intro:
        "Singular means one; plural means more than one. We usually add 's' (cat → cats). Add 'es' after x, s, sh, ch (box → boxes). Some words change fully (child → children).",
      example: "one dog → two dogs, one box → three boxes, one child → many children.",
    },
  },
];

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

export function getTopic(id: string): Topic | undefined {
  return BY_ID.get(id);
}
