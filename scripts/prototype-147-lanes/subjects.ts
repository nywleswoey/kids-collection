/**
 * PROTOTYPE — #147. Throwaway. Do not import this from anything.
 *
 * The subjects and the wording arms, kept in their own file so the grid is
 * readable as a table rather than buried in the runner.
 *
 * ── The three failure classes, one exemplar each ────────────────────────────
 * `seed/NEW-THEME-RUNBOOK.md` Step 4 predicts a per-provider failure for each,
 * and #143's requested spine lands on all three at once. The exemplars are the
 * ticket's, plus Pocong (whose admissibility under #145 rests entirely on the
 * lanes drawing CLOTH rather than a wrapped body) and one control.
 *
 * ── The arms ────────────────────────────────────────────────────────────────
 * The runbook's wording levers, in the order it says to try them, plus one the
 * ticket adds:
 *
 *   plain   the short noun phrase a card would naturally carry
 *   lead    lead with the defining object — "a tall wooden longbow held by…"
 *   drop    drop the object and let clothing or silhouette carry the subject
 *   banned  `plain` + #145's banned-setting list pasted in as a negative clause
 *
 * `banned` is the one with a PREDICTION attached, and it is the reason this
 * prototype is worth running rather than reasoning about. #81 measured that
 * naming a depictable object in any polarity puts it in the picture — "no
 * border" is a border cue. #145's banned list names fourteen depictable nouns
 * (graves, coffins, chains, bones, fire…) and the ticket proposes pasting it
 * into every `imagePrompt` in the theme. If #81 generalises, that clause
 * summons the exact scenery it forbids, and the spec must carry the rule as
 * WORDS THE AUTHOR DOES NOT WRITE rather than as a clause the model reads.
 */
export interface Arm {
  id: "plain" | "lead" | "drop" | "banned";
  /** Why this arm exists for this subject. Shown on the sheet. */
  because: string;
  prompt: string;
}

export interface Subject {
  name: string;
  /** The runbook's class, and what it predicts. */
  failureClass: string;
  control?: boolean;
  arms: Arm[];
}

/**
 * #145's setting ban, verbatim, phrased as the negative clause the ticket
 * proposes pasting into every card. Long on purpose: the question is partly
 * whether a clause THIS long survives at all next to a subject.
 */
export const BANNED_CLAUSE =
  "no fire, no pits, no chains, no cages, no courtroom, no punishment, " +
  "no bones or skulls, no graves, no tombstones, no coffins, no corpses, " +
  "no blood, and nobody being led away";

export const SUBJECTS: readonly Subject[] = [
  {
    name: "Ox-Head and Horse-Face",
    failureClass:
      "multi-object scene — pollinations recombines the parts; cloudflare-sdxl passes",
    arms: [
      {
        id: "plain",
        because: "the pair, as the figure actually is",
        prompt:
          "two friendly guards standing side by side on a quiet road at dusk, " +
          "one with the head of an ox and one with the head of a horse, in long belted robes",
      },
      {
        id: "lead",
        because: "lead with the defining feature — the two heads, before the two bodies",
        prompt:
          "an ox head and a horse head on two smiling guards in long belted robes, " +
          "standing together on a quiet road",
      },
      {
        id: "drop",
        because: "drop the second figure — does one guard alone still read as the card?",
        prompt:
          "a single cheerful guard with the head of an ox, in a long belted robe, " +
          "standing on green grass under a blue sky",
      },
      {
        id: "banned",
        because: "the pair, with #145's banned list pasted in",
        prompt:
          "two friendly guards standing side by side on a quiet road at dusk, " +
          "one with the head of an ox and one with the head of a horse, in long belted robes, " +
          BANNED_CLAUSE,
      },
    ],
  },
  {
    name: "Meng Po",
    failureClass:
      "small held object — BOTH main lanes fail; only the ai-horde hatch fixed it (#74)",
    arms: [
      {
        id: "plain",
        because: "the object as a card would naturally mention it, last",
        prompt:
          "a kind old grandmother in a simple robe standing on a stone bridge, " +
          "holding a small bowl of soup",
      },
      {
        id: "lead",
        because: "lead with the defining object — the runbook's first lever",
        prompt:
          "a steaming bowl of soup held in both hands by a kind smiling grandmother " +
          "in a simple robe, standing on a stone bridge",
      },
      {
        id: "drop",
        because:
          "drop the bowl entirely — the lever that rescued more cards than any other. " +
          "If this reads as Meng Po, the small-held-object class costs nothing here",
        prompt:
          "a kind smiling grandmother with white hair in a bun, in a simple long robe, " +
          "standing on a stone bridge over a river on a bright day",
      },
      {
        id: "banned",
        because: "the object, with #145's banned list pasted in",
        prompt:
          "a kind old grandmother in a simple robe standing on a stone bridge, " +
          "holding a small bowl of soup, " +
          BANNED_CLAUSE,
      },
    ],
  },
  {
    name: "Pontianak",
    failureClass:
      "niche costume accuracy — pollinations wrong century or country; cloudflare-sdxl usually passes, not reliably",
    arms: [
      {
        id: "plain",
        because: "the figure as the stories have her — night, banana tree",
        prompt:
          "a friendly woman ghost in a long white robe with long straight black hair, " +
          "floating beside a banana tree at night",
      },
      {
        id: "lead",
        because: "lead with the dress and the hair, which ARE the identity here",
        prompt:
          "a long white robe and long straight black hair on a cheerful floating woman ghost, " +
          "beside a green banana tree",
      },
      {
        id: "drop",
        because:
          "the runbook's third lever instead of the second — daylight and 'cheerful', " +
          "since a costume subject has no object to drop",
        prompt:
          "a cheerful woman ghost in a long white dress with long black hair, " +
          "floating beside a green banana tree on green grass under a blue sky",
      },
      {
        id: "banned",
        because: "the night framing, with #145's banned list pasted in",
        prompt:
          "a friendly woman ghost in a long white robe with long straight black hair, " +
          "floating beside a banana tree at night, " +
          BANNED_CLAUSE,
      },
    ],
  },
  {
    name: "Pocong",
    failureClass:
      "body rule (#145) — admissible ONLY if the lanes draw cloth rather than a wrapped body",
    arms: [
      {
        id: "plain",
        because: "the figure as a card would say it",
        prompt:
          "a friendly ghost shaped like a white cloth bundle tied with a knot at the top, " +
          "with a smiling cartoon face, hopping along a village path",
      },
      {
        id: "lead",
        because: "lead with the cloth and the knots — the thing that must be drawn instead of a body",
        prompt:
          "a white cloth bundle tied with a knot at the top and a knot at the bottom, " +
          "with a happy cartoon face, hopping",
      },
      {
        id: "drop",
        because: "daylight and green grass — the runbook's third lever, against a night-only subject",
        prompt:
          "a cheerful white cloth bundle ghost with a smiling face, " +
          "hopping on green grass under a blue sky",
      },
      {
        id: "banned",
        because: "the plain framing, with #145's banned list pasted in — the highest-risk pairing on the sheet",
        prompt:
          "a friendly ghost shaped like a white cloth bundle tied with a knot at the top, " +
          "with a smiling cartoon face, hopping along a village path, " +
          BANNED_CLAUSE,
      },
    ],
  },
  {
    name: "Yuki-onna",
    failureClass:
      "CONTROL — class `none`, reads from silhouette and colour. If this fails, the run is about the lanes, not the subjects",
    control: true,
    arms: [
      {
        id: "plain",
        because: "one arm only — its job is to prove the lanes can draw this theme's easy end",
        prompt:
          "a gentle smiling snow spirit in a long pale blue kimono, " +
          "standing in soft falling snow under a wide sky",
      },
    ],
  },
  {
    name: "Horse-Face alone",
    failureClass:
      "SPLIT TEST — if 牛頭馬面 becomes two cards, 馬面 must survive on his own. " +
      "Every prompt naming a horse so far drew an actual horse: a black horse beside a monk, a llama, a horse-plus-child",
    arms: [
      {
        id: "drop",
        because: "the exact wording that rescued the ox guard, with the head swapped",
        prompt:
          "a single cheerful guard with the head of a horse, in a long belted robe, " +
          "standing on green grass under a blue sky",
      },
      {
        id: "lead",
        because:
          "guard the upright body FIRST, then the head — the lanes' failure is reaching " +
          "for a four-legged animal, so say what shape the body is before naming the animal",
        prompt:
          "a smiling guard standing upright on two legs in a long belted robe, " +
          "with the head of a horse, on green grass under a blue sky",
      },
    ],
  },
  {
    name: "Horse-Face fused",
    failureClass:
      "SPLIT TEST, round 2 — 8/8 of round 1 parsed 'guard with the head of a horse' as " +
      "guard PLUS horse and drew both. These three fuse the two nouns into one, which is " +
      "the only lever left before the escape hatch",
    arms: [
      {
        id: "plain",
        because: "one hyphenated noun — the fusion done in the grammar",
        prompt:
          "a cheerful horse-headed guard in a long belted robe, " +
          "standing on green grass under a blue sky",
      },
      {
        id: "lead",
        because:
          "the minotaur route — 'ox' works because the model has an ox-headed humanoid prior. " +
          "Ask for the humanoid animal directly rather than for a man with a swapped head",
        prompt:
          "a friendly cartoon horse standing upright on two legs like a person, " +
          "wearing a long belted robe, on green grass under a blue sky",
      },
      {
        id: "drop",
        because: "no animal noun at all until the very end, and never as a free-standing subject",
        prompt:
          "a smiling guard in a long belted robe with a long horse muzzle, mane and ears, " +
          "standing on green grass under a blue sky",
      },
    ],
  },
  {
    name: "Ox-Head fused",
    failureClass:
      "CONFIRMATION — the ox already drew 3/4 from the prepositional form, but the horse " +
      "only ever drew from the hyphenated one. The spec wants ONE rule, so check the rule " +
      "that rescued the horse does not cost anything on the ox",
    arms: [
      {
        id: "plain",
        because: "the horse's winning wording, head swapped back",
        prompt:
          "a cheerful ox-headed guard in a long belted robe, " +
          "standing on green grass under a blue sky",
      },
    ],
  },
  {
    name: "Pontianak reworded",
    failureClass:
      "RESCUE — 'banana tree' drew a giant floating banana in 9 of 12. Does naming the " +
      "greenery WITHOUT a compound whose first word is itself a drawable object fix it?",
    arms: [
      {
        id: "plain",
        because: "same figure, the compound noun replaced by a plain plural",
        prompt:
          "a cheerful woman ghost in a long white dress with long black hair, " +
          "floating among tall leafy green plants under a blue sky",
      },
    ],
  },
  {
    name: "Pocong no-ghost",
    failureClass:
      "RESCUE — both lanes drew a generic bedsheet ghost. The word 'ghost' has an " +
      "overwhelming prior; the horse fix was to stop naming the thing that summons it",
    arms: [
      {
        id: "plain",
        because: "the word 'ghost' deleted entirely — the bundle has to carry the subject alone",
        prompt:
          "a tall white cloth bundle tied with a knot at the top, with a happy cartoon face, " +
          "hopping on green grass under a blue sky",
      },
    ],
  },
];
