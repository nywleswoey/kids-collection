import type { SwapTier } from "./board";

/**
 * What a tier band SAYS (#110). PURE, and beside the component rather than in
 * it, because the words are a rule the child reads: the tier is stated once
 * above a band instead of stamped on every tile, and the same sentence has to
 * reach a screen reader from the tile itself.
 */

/**
 * Who receives the cards in a column — what every band heading is addressed
 * to. A discriminant rather than a name string: the copy switches person for
 * the child's own column ("one more and YOU can burn it"), and deciding that
 * by comparing against the name would put a friend called "You" in the wrong
 * person. The column's glyph is derived from the same discriminant, so the
 * glyph and the person it addresses can never disagree.
 */
export type Receiver = { kind: "friend"; name: string } | { kind: "me" };

export const ME: Receiver = { kind: "me" };

export interface BandCopy {
  /** The band heading — a whole sentence, naming WHOSE shelf the tier is about. */
  heading: string;
  /**
   * The same sentence on the tile itself, for a screen reader: a band heading
   * is not announced with the button inside it, so the tier rides in each
   * tile's accessible name too. Every tier says something, `rest` included —
   * before #110 an unbadged tile meant "they already have it", but that was a
   * convention of the badges this ticket removed, and a listener who can't see
   * the band headings would be left inferring a tier from an absence. Singular
   * where the heading is plural: the heading counts a band, a tile is one card.
   */
  phrase: string;
}

/**
 * Both strings a band needs, from one sentence per tier. Written together so
 * they cannot drift: editing one would otherwise leave sighted and
 * screen-reader users reading different copy.
 */
export function bandCopy(tier: SwapTier, receiver: Receiver): BandCopy {
  const who = receiverName(receiver);
  switch (tier) {
    case "new":
      return said(receiver.kind === "friend" ? "🎁" : "🆕", `new for ${who}`);
    case "one-away":
      return said("🔥", `one more and ${who} can burn it`);
    case "rest":
      // The only tier whose subject is the receiver, so the only one whose verb
      // has to agree with the person — which is why it can't go through
      // `said`, and why heading and phrase are spelled out as a pair.
      return receiver.kind === "friend"
        ? { heading: `${who} already has these`, phrase: `${who} already has this` }
        : { heading: "You already have these", phrase: "you already have this" };
  }
}

/** How a heading names the receiver. */
function receiverName(receiver: Receiver): string {
  return receiver.kind === "friend" ? receiver.name : "you";
}

/**
 * One sentence, said twice: aloud on the tile as-is, and in the heading behind
 * the band's glyph with its opening word capitalised. Safe because every
 * sentence that reaches here opens on a literal ("new…", "one more…") — the
 * one that opens on the receiver's name is spelled out above, so a friend
 * called "ana" is never re-capitalised into someone else.
 */
function said(glyph: string, sentence: string): BandCopy {
  return {
    heading: `${glyph} ${sentence[0].toUpperCase()}${sentence.slice(1)}`,
    phrase: sentence,
  };
}
