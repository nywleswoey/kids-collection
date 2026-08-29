/**
 * Hand-authored grammar question banks (Inc11; Inc12 harder set). Upper-primary.
 * Every `correct` is one of `options`. Runtime picks 5 at random.
 */

import type { QuizQuestion } from "./types";

function mc(
  id: string,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation?: string,
): QuizQuestion {
  // Inc13 FR6: every question ships a one-line "why". A generic fallback covers
  // items without an authored explanation so feedback is never blank.
  return {
    id,
    prompt,
    options: [correct, ...distractors],
    correct,
    explanation: explanation ?? `The correct answer is "${correct}".`,
  };
}

/** Verb Tenses — past / present / past-continuous. */
const verbTenses: QuizQuestion[] = [
  mc("vt-1", "Yesterday, I ___ to the park.", "walked", ["walk", "walking", "walks"]),
  mc("vt-2", "Every morning, she ___ her teeth.", "brushes", ["brushed", "brushing", "brush"]),
  mc("vt-3", "Right now, the baby ___ sleeping.", "is", ["was", "were", "be"]),
  mc("vt-4", "Choose the past tense: 'They ___ football last Sunday.'", "played", ["play", "plays", "playing"]),
  mc("vt-5", "Which is past continuous? 'While it rained, we ___ inside.'", "were playing", ["played", "play", "are playing"]),
  mc("vt-6", "Present tense: 'He ___ to school by bus.'", "goes", ["went", "going", "gone"]),
  mc("vt-7", "'Last night I ___ my homework.'", "did", ["do", "does", "doing"]),
  mc("vt-8", "Past continuous: 'At 8 pm I ___ my dinner.'", "was eating", ["ate", "eat", "eats"]),
  mc("vt-9", "'The sun ___ in the east every day.'", "rises", ["rose", "rising", "risen"]),
  mc("vt-10", "'We ___ a movie when the lights went out.'", "were watching", ["watched", "watch", "watches"]),
  mc("vt-11", "Past tense of 'run': 'She ___ very fast.'", "ran", ["run", "running", "runs"]),
  mc("vt-12", "'Look! The dog ___ chasing its tail now.'", "is", ["was", "were", "been"]),
  mc("vt-13", "'They ___ their grandparents last week.'", "visited", ["visit", "visiting", "visits"]),
  mc("vt-14", "Present: 'Water ___ at 100 degrees.'", "boils", ["boiled", "boiling", "boil"]),
  mc("vt-15", "Past continuous: 'The children ___ in the garden all afternoon.'", "were playing", ["played", "play", "plays"]),
  mc("vt-16", "'I ___ my keys yesterday.'", "lost", ["lose", "losing", "loses"]),
];

/** Pronouns vs Proper Nouns. */
const pronounsProperNouns: QuizQuestion[] = [
  mc("pp-1", "Which word is a pronoun?", "she", ["Mary", "Singapore", "Monday"]),
  mc("pp-2", "Which word is a proper noun?", "London", ["he", "city", "they"]),
  mc("pp-3", "Which word is a pronoun?", "they", ["David", "dog", "school"]),
  mc("pp-4", "Which word is a proper noun?", "Amir", ["it", "boy", "we"]),
  mc("pp-5", "In 'Sara loves her cat.', which word is a pronoun?", "her", ["Sara", "cat", "loves"]),
  mc("pp-6", "Which is a proper noun?", "January", ["month", "she", "them"]),
  mc("pp-7", "Which word is a pronoun?", "we", ["Tokyo", "teacher", "river"]),
  mc("pp-8", "Which is a proper noun?", "Everest", ["mountain", "it", "you"]),
  mc("pp-9", "In 'They visited Rome.', which is the proper noun?", "Rome", ["They", "visited", "city"]),
  mc("pp-10", "Which word is a pronoun?", "him", ["John", "ball", "park"]),
  mc("pp-11", "Which is a proper noun?", "Nile", ["river", "it", "we"]),
  mc("pp-12", "Which word is a pronoun?", "it", ["Kumar", "house", "car"]),
  mc("pp-13", "In 'Mr Tan drives us to school.', which word is a pronoun?", "us", ["Mr Tan", "school", "drives"]),
  mc("pp-14", "Which is a proper noun?", "Singapore", ["country", "they", "island"]),
  mc("pp-15", "Which word is a pronoun?", "you", ["Sunday", "apple", "Anna"]),
  mc("pp-16", "Which is a proper noun?", "Diwali", ["festival", "he", "it"]),
];

/** Adjectives vs Adverbs. */
const adjectivesAdverbs: QuizQuestion[] = [
  mc("aa-1", "Which word is an adjective?", "happy", ["quickly", "run", "loudly"]),
  mc("aa-2", "Which word is an adverb?", "slowly", ["slow", "car", "big"]),
  mc("aa-3", "'She sang ___.' (choose the adverb)", "beautifully", ["beautiful", "beauty", "beautify"]),
  mc("aa-4", "'It was a ___ day.' (choose the adjective)", "sunny", ["sunnily", "sun", "shine"]),
  mc("aa-5", "Which word describes a noun (adjective)?", "tall", ["neatly", "quickly", "softly"]),
  mc("aa-6", "Which word describes a verb (adverb)?", "carefully", ["careful", "care", "caring"]),
  mc("aa-7", "'The turtle moved ___.'", "slowly", ["slow", "slowness", "slower one"]),
  mc("aa-8", "'He is a ___ runner.'", "fast", ["quickly", "swiftly", "loudly"]),
  mc("aa-9", "Adverb: 'She spoke very ___.'", "quietly", ["quiet", "quietness", "quieter thing"]),
  mc("aa-10", "Adjective: 'What a ___ cake!'", "delicious", ["deliciously", "delight", "deliciousness"]),
  mc("aa-11", "Which is an adverb?", "loudly", ["loud", "noise", "big"]),
  mc("aa-12", "Which is an adjective?", "brave", ["bravely", "run", "quickly"]),
  mc("aa-13", "'The stars shone ___ in the sky.'", "brightly", ["bright light", "bright", "brightness"]),
  mc("aa-14", "'That is a ___ dog.'", "friendly", ["friendlily", "friend", "friendship"]),
  mc("aa-15", "Adverb: 'He finished the test ___.'", "easily", ["easy", "ease", "easier one"]),
  mc("aa-16", "Adjective: 'The soup is too ___.'", "hot", ["hotly", "heat", "hotness"]),
];

/** Conjunctions — and / but / because / or / so. */
const conjunctions: QuizQuestion[] = [
  mc("cj-1", "I was tired, ___ I went to bed.", "so", ["but", "or", "because"]),
  mc("cj-2", "She likes tea ___ coffee.", "and", ["but", "so", "because"]),
  mc("cj-3", "He ran fast, ___ he still missed the bus.", "but", ["and", "so", "or"]),
  mc("cj-4", "We stayed home ___ it was raining.", "because", ["and", "or", "but"]),
  mc("cj-5", "Would you like an apple ___ a pear?", "or", ["and", "so", "because"]),
  mc("cj-6", "It was cold, ___ we wore jackets.", "so", ["but", "or", "because"]),
  mc("cj-7", "I wanted to play, ___ I had to study.", "but", ["and", "so", "or"]),
  mc("cj-8", "She was happy ___ she won the race.", "because", ["but", "or", "and"]),
  mc("cj-9", "You can have milk ___ juice.", "or", ["so", "because", "but"]),
  mc("cj-10", "The dog barked ___ wagged its tail.", "and", ["but", "because", "or"]),
  mc("cj-11", "He studied hard, ___ he passed the test.", "so", ["but", "or", "because"]),
  mc("cj-12", "I like the book ___ it is a little long.", "but", ["so", "and", "because"]),
  mc("cj-13", "We brought umbrellas ___ it might rain.", "because", ["and", "or", "but"]),
  mc("cj-14", "Do you want to walk ___ take the bus?", "or", ["and", "so", "because"]),
];

/** Prepositions — in / on / under / between / behind / next to. */
const prepositions: QuizQuestion[] = [
  mc("pr-1", "The cat is ___ the table. (on top of it)", "on", ["in", "under", "between"]),
  mc("pr-2", "The ball rolled ___ the bed. (hidden below)", "under", ["on", "above", "beside"]),
  mc("pr-3", "The milk is ___ the fridge.", "in", ["on", "under", "between"]),
  mc("pr-4", "She sat ___ her two friends.", "between", ["on", "under", "in"]),
  mc("pr-5", "The picture hangs ___ the wall.", "on", ["in", "under", "between"]),
  mc("pr-6", "The dog is hiding ___ the sofa. (at the back)", "behind", ["on", "in", "between"]),
  mc("pr-7", "Put your shoes ___ the box.", "in", ["on", "between", "under"]),
  mc("pr-8", "The bird flew ___ the tree. (up over it)", "over", ["under", "in", "between"]),
  mc("pr-9", "The bank is ___ to the school.", "next", ["in", "under", "between"]),
  mc("pr-10", "There is a rug ___ the floor.", "on", ["in", "under", "between"]),
  mc("pr-11", "The toys are ___ the basket.", "in", ["on", "over", "between"]),
  mc("pr-12", "The bridge goes ___ the river. (across, above)", "over", ["in", "under", "between"]),
  mc("pr-13", "My pencil fell ___ the chair. (below)", "under", ["on", "in", "over"]),
  mc("pr-14", "Stand ___ the line, please. (on it)", "on", ["in", "under", "between"]),
];

/** Subject–Verb Agreement. */
const subjectVerbAgreement: QuizQuestion[] = [
  mc("sv-1", "She ___ to school every day.", "goes", ["go", "going", "gone"]),
  mc("sv-2", "They ___ football on Sundays.", "play", ["plays", "playing", "is play"]),
  mc("sv-3", "The dog ___ loudly at night.", "barks", ["bark", "barking", "are bark"]),
  mc("sv-4", "My friends ___ very kind.", "are", ["is", "am", "be"]),
  mc("sv-5", "He ___ his homework now.", "does", ["do", "doing", "done"]),
  mc("sv-6", "The children ___ in the pool.", "swim", ["swims", "swimming", "is swim"]),
  mc("sv-7", "That bird ___ beautifully.", "sings", ["sing", "singing", "are sing"]),
  mc("sv-8", "I ___ a big family.", "have", ["has", "having", "haves"]),
  mc("sv-9", "The baby ___ when it is hungry.", "cries", ["cry", "crying", "are cry"]),
  mc("sv-10", "We ___ our teacher.", "like", ["likes", "liking", "is like"]),
  mc("sv-11", "The cat and the dog ___ friends.", "are", ["is", "am", "be"]),
  mc("sv-12", "My mother ___ delicious food.", "cooks", ["cook", "cooking", "are cook"]),
  mc("sv-13", "You ___ very tall.", "are", ["is", "am", "be"]),
  mc("sv-14", "The boys ___ their bicycles to school.", "ride", ["rides", "riding", "is ride"]),
  mc("sv-15", "It ___ hot in the afternoon.", "gets", ["get", "getting", "are get"]),
  mc("sv-16", "The students ___ hard for the exam.", "study", ["studies", "studying", "is study"]),
];

/** Map of grammar topic IDs to their question banks. */
export const GRAMMAR_BANKS: Record<string, QuizQuestion[]> = {
  "verb-tenses": verbTenses,
  "pronouns-vs-proper-nouns": pronounsProperNouns,
  "adjectives-vs-adverbs": adjectivesAdverbs,
  "conjunctions": conjunctions,
  "prepositions": prepositions,
  "subject-verb-agreement": subjectVerbAgreement,
};

/** True if the given topic ID is a grammar topic with a question bank. */
export function isGrammarTopic(topicId: string): boolean {
  return topicId in GRAMMAR_BANKS;
}
