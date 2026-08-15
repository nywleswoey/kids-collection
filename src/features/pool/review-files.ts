/**
 * How a bake-off candidate is named on disk, and whose candidate gets published
 * (#63, #67).
 *
 * Pure — path arithmetic only, no I/O — so `--review` and the FR9 publish guard
 * can share it and cannot drift apart. That is the same reason `publish-plan.ts`
 * is pure: two callers must never disagree about which file a card's reviewed
 * image lives in, or an honest review sitting can still leave the guard
 * unsatisfied.
 */
import { z } from "zod";
import { EXTENSIONS } from "./image-size";
import { reviewKey } from "./keys";
import { cardKey } from "./publish-plan";
import {
  providerSegment,
  type GeneratedImage,
  type ImageProvider,
} from "./providers/provider";
import type { SeedCard } from "./seed-schema";

/** Minimal shape a card needs to be named. */
export type NamedCard = Pick<SeedCard, "name" | "imagePrompt">;

/** The adapter facts a filename depends on. */
export type NamingProvider = Pick<ImageProvider, "id" | "params" | "format">;

/**
 * The stem every artifact of one bake-off candidate shares:
 *   `<theme>-<card>-<promptHash8>-<providerId>-<paramHash4>`
 *
 * The single place `reviewKey` is composed with a provider. The image, the
 * sidecar and #75's durable record all name the same candidate, so all three
 * derive from here rather than each assembling the same three inputs — a
 * second assembly is a second thing to drift, which is this module's whole
 * reason for existing.
 */
export function reviewStem(
  themeName: string,
  card: NamedCard,
  provider: NamingProvider,
): string {
  return reviewKey(themeName, card, providerSegment(provider));
}

/**
 * Filename of one bake-off candidate: the stem, with the provider's extension.
 *
 * The extension follows the provider, because they do not agree: Pollinations
 * serves JPEG, Cloudflare Workers AI serves PNG. A fixed `.jpg` would be a lie
 * on disk and would make the contact sheet's `<img>` tags depend on a browser
 * ignoring it.
 */
export function reviewFileName(
  themeName: string,
  card: NamedCard,
  provider: NamingProvider,
): string {
  return `${reviewStem(themeName, card, provider)}.${EXTENSIONS[provider.format]}`;
}

/**
 * Sidecar holding what the response actually reported.
 *
 * It exists because #64 proved a provider can swap the model underneath a stable
 * prompt with no announcement — a request for `flux` served by `sana`. So
 * `params.model` records what was ASKED FOR and the sidecar records what
 * ANSWERED, and the contact sheet labels each grid cell with the latter. That
 * puts a silent model swap in front of a human at checkpoint 2, which is the one
 * moment someone is already looking.
 *
 * Alongside rather than inside the image: adding an EXIF writer would be a new
 * dependency, and `seed/review/` is uncommitted scratch either way.
 */
export function sidecarFileName(
  themeName: string,
  card: NamedCard,
  provider: NamingProvider,
): string {
  return `${reviewStem(themeName, card, provider)}.json`;
}

const reviewSidecarSchema = z.object({
  provider: z.string().min(1),
  /** What the response named, where it named anything. Absent means unwitnessed. */
  model: z.string().min(1).optional(),
  /** What was requested — the hashed bag, recorded so a stale file is explicable. */
  params: z.record(z.union([z.string(), z.number(), z.boolean()])),
  format: z.string().min(1),
});

export type ReviewSidecar = z.infer<typeof reviewSidecarSchema>;

/**
 * Read a sidecar's contents back, or undefined for anything that is not one.
 *
 * Both readers go through here — the contact sheet's model labels and #75's
 * durable record — so neither can accept a shape the other would reject. Pure:
 * the callers own the filesystem, this owns what a sidecar IS.
 *
 * Undefined rather than throwing, for both of them. A malformed file in
 * gitignored scratch must not fail a publish, and must not put junk in a grid
 * cell either.
 */
export function parseSidecar(raw: string): ReviewSidecar | undefined {
  try {
    const parsed = reviewSidecarSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Which provider's candidate `--sync` publishes: the card's own override, else
 * the theme's default (#63).
 *
 * Undefined is a legitimate state, not an error — it is a theme whose bake-off
 * has not been judged yet. It resolves to no filename, so FR9 finds no reviewed
 * image and refuses to insert. A theme where no pick was ever made publishes
 * nothing, by construction rather than by a new check.
 */
export function resolveProviderId(
  theme: { provider?: string },
  card: { provider?: string },
): string | undefined {
  return card.provider ?? theme.provider;
}

/** What a sidecar records about one generated candidate. */
export function buildSidecar(
  provider: Pick<ImageProvider, "id" | "params">,
  image: GeneratedImage,
): ReviewSidecar {
  return {
    provider: provider.id,
    model: image.model,
    params: { ...provider.params },
    format: image.format,
  };
}

// ── The FR9 audit ────────────────────────────────────────────────────────────
//
// Pure, and here rather than in the CLI, for the reason `publish-plan.ts` gives:
// `--review` and the publish guard must compute the same answer from the same
// function, or an honest review sitting can still leave the guard unsatisfied —
// or worse, satisfy it while leaving a card unreviewed.

export interface AuditTheme {
  name: string;
  provider?: string;
  cards: readonly (NamedCard & { provider?: string })[];
}

export interface UnknownProviderCard {
  theme: string;
  card: string;
  providerId: string;
}

export interface UnreviewedCard {
  theme: string;
  card: string;
  reason: string;
}

/**
 * Planned inserts naming a provider id no adapter answers to (#67).
 *
 * Checked separately from, and before, the missing-review audit because it is a
 * different mistake with a different fix: a typo or a retired adapter. Reporting
 * it as "no reviewed image" would send the author off to re-run a review that
 * could never satisfy the guard.
 */
export function unknownProviders(
  themes: readonly AuditTheme[],
  planned: ReadonlySet<string>,
  lookup: (id: string) => NamingProvider | undefined,
): UnknownProviderCard[] {
  const out: UnknownProviderCard[] = [];
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (!planned.has(cardKey(theme.name, card.name))) continue;
      const id = resolveProviderId(theme, card);
      if (id !== undefined && !lookup(id)) {
        out.push({ theme: theme.name, card: card.name, providerId: id });
      }
    }
  }
  return out;
}

/**
 * Planned inserts with no reviewed image on disk (FR9).
 *
 * Two distinct ways to be unreviewed, reported distinctly because the remedies
 * differ: a card with no pick needs a `provider` written into `seed/cards.json`,
 * while a card whose pick has no file needs another review round. Both refuse
 * the insert; only one of them is fixed by re-running `--review`.
 *
 * `exists` takes a bare filename so the caller owns the directory and this stays
 * free of I/O.
 */
export function missingReviews(
  themes: readonly AuditTheme[],
  planned: ReadonlySet<string>,
  lookup: (id: string) => NamingProvider | undefined,
  exists: (fileName: string) => boolean,
): UnreviewedCard[] {
  const missing: UnreviewedCard[] = [];
  for (const theme of themes) {
    for (const card of theme.cards) {
      if (!planned.has(cardKey(theme.name, card.name))) continue;
      const id = resolveProviderId(theme, card);
      const provider = id === undefined ? undefined : lookup(id);
      if (!provider) {
        missing.push({
          theme: theme.name,
          card: card.name,
          reason:
            id === undefined
              ? "no provider chosen (bake-off not judged)"
              : `unknown provider "${id}"`,
        });
        continue;
      }
      if (!exists(reviewFileName(theme.name, card, provider))) {
        missing.push({
          theme: theme.name,
          card: card.name,
          reason: `no reviewed image from ${provider.id}`,
        });
      }
    }
  }
  return missing;
}
