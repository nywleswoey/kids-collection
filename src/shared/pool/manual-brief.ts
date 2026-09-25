/**
 * The manual SuperGrok lane's drop-folder contract.
 *
 * SuperGrok (the Grok subscription) is not an image API this repo can call.
 * Calling Grok from code is xAI's billed API, which the $0 rule forbids. The
 * owner generates each picture by hand, under that subscription, and saves it
 * here. `--review` then reads those files as one more bake-off lane.
 *
 * Pure — no I/O — so the export command and the provider agree on the filename
 * without either owning the filesystem. The owner-facing brief is rendered from
 * the same entries the provider later finds by prompt hash.
 */
import { createHash } from "node:crypto";
import { buildPrompt } from "./prompt";
import { slug } from "./keys";
import { cardKey } from "./publish-plan";
import type { SeedCard } from "./seed-schema";

/** Where the owner saves pictures, and where the brief is written. Gitignored. */
export const SUPERGROK_DROP_DIR = "seed-content/supergrok-drop";

/** The file the owner works through, one card per entry. Inside the drop folder. */
export const SUPERGROK_BRIEF_NAME = "brief.md";

/** First 8 hex chars of sha256 over the exact prompt string sent to a lane. */
export function promptDigest(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex").slice(0, 8);
}

/**
 * Stem of the file the owner saves: `<theme>-<card>-<promptHash8>`.
 *
 * The hash is of `buildPrompt`'s output, the same string every other lane
 * receives, so an `ART_STYLE` edit renames the file the owner must supply —
 * the same staleness rule review filenames already have. The theme and card
 * slugs are for the human reading the folder; the provider finds the file by
 * the hash alone, because `generate()` is handed the prompt and nothing else.
 */
export function manualDropStem(themeName: string, cardName: string, prompt: string): string {
  return `${slug(`${themeName}-${cardName}`)}-${promptDigest(prompt)}`;
}

export interface ManualBriefEntry {
  theme: string;
  card: string;
  /** Exact `buildPrompt` output, `ART_STYLE` included. */
  prompt: string;
  /** Suggested save name. `.jpg`, `.jpeg`, and `.webp` with this stem also import. */
  fileName: string;
}

type BriefCard = Pick<SeedCard, "name" | "imagePrompt">;

/**
 * One entry per card `--review` would draw: the planned inserts, in seed order.
 *
 * Same `cardKey` and same planned set the bake-off uses, so the brief cannot
 * list a card the review run will skip, or skip one it will ask for.
 */
export function planManualBrief(
  themes: readonly { name: string; cards: readonly BriefCard[] }[],
  planned: ReadonlySet<string>,
): ManualBriefEntry[] {
  const entries: ManualBriefEntry[] = [];
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (!planned.has(cardKey(theme.name, card.name))) continue;
      const prompt = buildPrompt(card);
      entries.push({
        theme: theme.name,
        card: card.name,
        prompt,
        fileName: `${manualDropStem(theme.name, card.name, prompt)}.png`,
      });
    }
  }
  return entries;
}

/** Markdown the owner works through. One `##` entry per card. */
export function renderManualBrief(entries: readonly ManualBriefEntry[]): string {
  const lines = [
    "# SuperGrok manual pictures",
    "",
    "Generate each picture yourself in Grok — the app, grok.com, or X — under your subscription.",
    "Paste the prompt exactly. It is the same text every automatic lane receives, including the art style.",
    "Save the picture into this folder under the filename given.",
    "`.jpg`, `.jpeg`, or `.webp` is accepted when that is what Grok downloaded; keep the stem.",
    "",
    "Then import them into the bake-off:",
    "",
    "```bash",
    "pnpm seed --review --providers=supergrok-manual",
    "```",
    "",
    'A card with no picture shows as "not drawn" on the contact sheet.',
    "That is a missing file. It is not a drawing this lane rejected.",
    "To replace an imported picture, delete that card's `supergrok-manual` review file (and its `.json` sidecar) before importing again.",
    "",
    `${entries.length} card(s) the bake-off would draw.`,
    "",
  ];
  if (entries.length === 0) {
    lines.push(
      "Nothing to draw: every card in the seed is already published, so `--review` would skip them all.",
      "",
    );
  }
  entries.forEach((entry, i) => {
    lines.push(
      `## ${i + 1}. ${entry.card}`,
      "",
      `Theme: ${entry.theme}`,
      "",
      `Save as: \`${entry.fileName}\``,
      "",
      "Prompt:",
      "",
      "```",
      entry.prompt,
      "```",
      "",
    );
  });
  return lines.join("\n");
}

export type DropMatch =
  | { kind: "one"; fileName: string }
  | { kind: "none"; hash: string }
  | { kind: "many"; fileNames: string[] };

/**
 * Find the owner's picture for this exact prompt among drop-folder names.
 *
 * Matched on the prompt hash suffix, any accepted extension, so the provider
 * does not need the theme or card name `generate()` is not given. Two files
 * for one hash is ambiguous and reported, never silently picked.
 */
export function findDropFile(prompt: string, fileNames: readonly string[]): DropMatch {
  const hash = promptDigest(prompt);
  const hits = fileNames.filter((name) => {
    const lower = name.toLowerCase();
    return (
      lower.endsWith(`-${hash}.png`) ||
      lower.endsWith(`-${hash}.jpg`) ||
      lower.endsWith(`-${hash}.jpeg`) ||
      lower.endsWith(`-${hash}.webp`)
    );
  });
  if (hits.length === 0) return { kind: "none", hash };
  if (hits.length === 1) return { kind: "one", fileName: hits[0]! };
  return { kind: "many", fileNames: [...hits].sort() };
}
