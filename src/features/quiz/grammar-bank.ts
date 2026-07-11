/**
 * Hand-authored grammar question banks (Inc11 Q1=D). SG lower-primary. Every
 * `correct` is verified to be one of `options`. Runtime picks 5 at random.
 */

import type { QuizQuestion } from "./types";

function mc(
  id: string,
  prompt: string,
  correct: string,
  distractors: string[],
): QuizQuestion {
  return { id, prompt, options: [correct, ...distractors], correct };
}

/** Nouns vs Verbs — "is this word a naming word or an action word?" */
const nounsVerbs: QuizQuestion[] = [
  mc("nv-1", "Which word is a noun (a naming word)?", "dog", ["run", "jump", "eat"]),
  mc("nv-2", "Which word is a verb (an action word)?", "swim", ["table", "apple", "chair"]),
  mc("nv-3", "Which word is a noun?", "school", ["sing", "read", "play"]),
  mc("nv-4", "Which word is a verb?", "kick", ["ball", "field", "shoe"]),
  mc("nv-5", "Which word is a naming word?", "teacher", ["write", "talk", "walk"]),
  mc("nv-6", "Which word is an action word?", "jump", ["park", "slide", "bench"]),
  mc("nv-7", "In 'The cat sleeps.', which word is the verb?", "sleeps", ["The", "cat", "."]),
  mc("nv-8", "In 'Boys play football.', which word is the noun?", "football", ["play", "fast", "loudly"]),
  mc("nv-9", "Which word is a noun?", "flower", ["grow", "smell", "pick"]),
  mc("nv-10", "Which word is a verb?", "drink", ["water", "cup", "juice"]),
  mc("nv-11", "Which word names a thing?", "bus", ["ride", "wait", "stop"]),
  mc("nv-12", "Which word shows an action?", "clap", ["hand", "song", "stage"]),
  mc("nv-13", "In 'She reads a book.', which word is the verb?", "reads", ["She", "book", "a"]),
  mc("nv-14", "Which word is a noun?", "river", ["flow", "splash", "float"]),
  mc("nv-15", "Which word is a verb?", "paint", ["brush", "colour", "wall"]),
  mc("nv-16", "Which word is a naming word?", "market", ["buy", "sell", "pay"]),
];

/** A / An / The — choosing the right article. */
const articles: QuizQuestion[] = [
  mc("ar-1", "I saw ___ elephant at the zoo.", "an", ["a", "the", "no word"]),
  mc("ar-2", "She has ___ cat.", "a", ["an", "the", "no word"]),
  mc("ar-3", "___ sun is very hot today.", "The", ["A", "An", "No word"]),
  mc("ar-4", "He ate ___ apple.", "an", ["a", "the", "no word"]),
  mc("ar-5", "Can I have ___ orange, please?", "an", ["a", "the", "no word"]),
  mc("ar-6", "We went to ___ park near my house.", "the", ["a", "an", "no word"]),
  mc("ar-7", "There is ___ bird on the tree.", "a", ["an", "the", "no word"]),
  mc("ar-8", "I need ___ umbrella because it is raining.", "an", ["a", "the", "no word"]),
  mc("ar-9", "___ moon is bright tonight.", "The", ["A", "An", "No word"]),
  mc("ar-10", "My father drives ___ car.", "a", ["an", "the", "no word"]),
  mc("ar-11", "She is reading ___ interesting book.", "an", ["a", "the", "no word"]),
  mc("ar-12", "Please close ___ door when you leave.", "the", ["a", "an", "no word"]),
  mc("ar-13", "I want ___ ice cream.", "an", ["a", "the", "no word"]),
  mc("ar-14", "He is ___ honest boy.", "an", ["a", "the", "no word"]),
  mc("ar-15", "We saw ___ rainbow after the rain.", "a", ["an", "the", "no word"]),
  mc("ar-16", "___ Earth goes around the Sun.", "The", ["A", "An", "No word"]),
];

/** Singular vs Plural — the correct plural form. */
const singularPlural: QuizQuestion[] = [
  mc("sp-1", "What is the plural of 'cat'?", "cats", ["cat", "cates", "caties"]),
  mc("sp-2", "What is the plural of 'box'?", "boxes", ["boxs", "box", "boxies"]),
  mc("sp-3", "What is the plural of 'baby'?", "babies", ["babys", "babyes", "baby"]),
  mc("sp-4", "What is the plural of 'child'?", "children", ["childs", "childrens", "childes"]),
  mc("sp-5", "What is the plural of 'bus'?", "buses", ["buss", "busses", "bus"]),
  mc("sp-6", "What is the plural of 'foot'?", "feet", ["foots", "feets", "foot"]),
  mc("sp-7", "What is the plural of 'dog'?", "dogs", ["doges", "dog", "dogies"]),
  mc("sp-8", "What is the plural of 'leaf'?", "leaves", ["leafs", "leafes", "leaf"]),
  mc("sp-9", "What is the plural of 'man'?", "men", ["mans", "mens", "man"]),
  mc("sp-10", "What is the plural of 'brush'?", "brushes", ["brushs", "brush", "brushies"]),
  mc("sp-11", "What is the plural of 'toy'?", "toys", ["toies", "toy", "toyes"]),
  mc("sp-12", "What is the plural of 'mouse'?", "mice", ["mouses", "mouse", "mices"]),
  mc("sp-13", "What is the plural of 'book'?", "books", ["bookes", "book", "bookies"]),
  mc("sp-14", "What is the plural of 'tooth'?", "teeth", ["tooths", "teeths", "tooth"]),
  mc("sp-15", "What is the plural of 'lady'?", "ladies", ["ladys", "ladyes", "lady"]),
  mc("sp-16", "What is the plural of 'fish'?", "fish", ["fishs", "fishies", "fishess"]),
];

export const GRAMMAR_BANKS: Record<string, QuizQuestion[]> = {
  "nouns-vs-verbs": nounsVerbs,
  "articles": articles,
  "singular-vs-plural": singularPlural,
};

export function isGrammarTopic(topicId: string): boolean {
  return topicId in GRAMMAR_BANKS;
}
