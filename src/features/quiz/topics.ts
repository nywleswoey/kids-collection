/** Quiz topics (Inc11; Inc12 harder set) — titles + authored lessons. Single
 * source of truth for the picker, lesson screens, and question routing. */

import type { Topic } from "./types";

/** All available quiz topics with their lessons. */
export const TOPICS: Topic[] = [
  {
    id: "multiplication-within-100",
    subject: "math",
    title: "Multiplication within 100",
    lesson: {
      intro:
        "Multiplication is repeated addition — putting equal groups together. Knowing your times tables helps you find the answer quickly.",
      example: "7 × 8 means 8 added seven times (or 7 added eight times) = 56.",
    },
  },
  {
    id: "division-within-100",
    subject: "math",
    title: "Division within 100",
    lesson: {
      intro:
        "Division shares a number into equal groups. It is the opposite of multiplication, so your times tables help here too.",
      example: "56 ÷ 8: how many 8s make 56? Since 8 × 7 = 56, the answer is 7.",
    },
  },
  {
    id: "number-bonds-1000",
    subject: "math",
    title: "Number Bonds to 1000",
    lesson: {
      intro:
        "Number bonds to 1000 are two numbers that add up to make 1000. Tip: make the ones add to 10, then the tens add to 90, then the hundreds add to 900.",
      example: "For 463, you need 537 more: 3 + 7 = 10, 60 + 30 = 90, 400 + 500 = 900. So 463 + 537 = 1000.",
    },
  },
  {
    id: "fractions",
    subject: "math",
    title: "Fractions",
    lesson: {
      intro:
        "A fraction shows equal parts of a whole. The bottom number says how many equal parts there are; the top number says how many we have. To add or subtract fractions with the same bottom number, work with the top numbers only.",
      example:
        "A bar cut into 4 equal parts with 3 shaded is 3/4. And 1/5 + 3/5 = 4/5 — the bottom number stays 5.",
    },
  },
  {
    id: "verb-tenses",
    subject: "grammar",
    title: "Verb Tenses",
    lesson: {
      intro:
        "The present tense is happening now (I walk). The past tense already happened (I walked). The past continuous is something that was going on (I was walking).",
      example: "Now: She eats. Past: She ate. Past continuous: She was eating when the phone rang.",
    },
  },
  {
    id: "pronouns-vs-proper-nouns",
    subject: "grammar",
    title: "Pronouns vs Proper Nouns",
    lesson: {
      intro:
        "A proper noun is the special name of a person, place, or thing and always starts with a capital letter (Mary, Singapore). A pronoun takes the place of a noun (he, she, it, they, we, us, him, her).",
      example: "Instead of 'Mary loves Mary's cat', we say 'She loves her cat'. 'Mary' is a proper noun; 'She' and 'her' are pronouns.",
    },
  },
  {
    id: "adjectives-vs-adverbs",
    subject: "grammar",
    title: "Adjectives vs Adverbs",
    lesson: {
      intro:
        "An adjective describes a noun (a happy boy). An adverb describes a verb — how something is done — and often ends in -ly (he sang loudly).",
      example: "'A quick fox' — quick is an adjective. 'The fox ran quickly' — quickly is an adverb.",
    },
  },
  {
    id: "conjunctions",
    subject: "grammar",
    title: "Conjunctions",
    lesson: {
      intro:
        "A conjunction is a joining word. Use 'and' to add, 'but' to show a difference, 'or' to give a choice, 'because' to give a reason, and 'so' to show a result.",
      example: "I was hungry, so I ate. I like apples but not pears.",
    },
  },
  {
    id: "prepositions",
    subject: "grammar",
    title: "Prepositions",
    lesson: {
      intro:
        "A preposition tells us where or when something is — like in, on, under, over, between, behind, and next to.",
      example: "The cat is on the mat. The ball is under the chair. She sat between her friends.",
    },
  },
  {
    id: "subject-verb-agreement",
    subject: "grammar",
    title: "Subject–Verb Agreement",
    lesson: {
      intro:
        "The verb must match its subject. For one person or thing (he, she, it), we usually add -s to the verb. For more than one (they, we), we do not.",
      example: "She walks to school. They walk to school. The dog barks. The dogs bark.",
    },
  },
];

const BY_ID = new Map(TOPICS.map((t) => [t.id, t]));

/** Look up a topic by id; returns undefined if not found. */
export function getTopic(id: string): Topic | undefined {
  return BY_ID.get(id);
}

/**
 * Topic ids that no longer exist but still appear in `quiz_completions` history
 * (Inc25 FR6). History is NEVER rewritten — rewriting children's rows to claim
 * attempts at a quiz that did not exist when they were taken was explicitly
 * rejected — so the admin view resolves the retired id to a label instead.
 */
const RETIRED_TOPIC_TITLES: Record<string, string> = {
  "number-bonds-100": "Number Bonds to 100 (retired)",
};

/**
 * Display name for a topic id: live title → retired label → the raw id. The
 * raw-id fallback stays as the last resort for an id in neither map.
 */
export function topicTitle(id: string): string {
  return BY_ID.get(id)?.title ?? RETIRED_TOPIC_TITLES[id] ?? id;
}

/**
 * Topic ids by subject — the source of truth for the daily draw's "at least one
 * maths" guarantee (Inc25 FR7). Derived from TOPICS, never from generator
 * registration, so it stays correct as generators come and go.
 */
export const MATH_TOPIC_IDS: string[] = TOPICS.filter((t) => t.subject === "math").map((t) => t.id);
/** Grammar topic IDs derived from TOPICS array. */
export const GRAMMAR_TOPIC_IDS: string[] = TOPICS.filter((t) => t.subject === "grammar").map((t) => t.id);
