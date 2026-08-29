/**
 * The review contact sheet — checkpoint 2's artifact (#63 Step 7, #67).
 *
 * ── Why this stopped being a `node -e` one-liner in the runbook ──────────────
 * The runbook's inline script did two things that #67's filenames break, and it
 * broke them SILENTLY, which is the worst way for a review gate to fail:
 *
 *     files = readdir(...).filter(f => f.startsWith(slug(theme)) && f.endsWith(".jpg"))
 *     find  = c => files.find(f => f.startsWith(slug(theme + "-" + c.name) + "-"))
 *
 * The `.jpg` filter drops every Cloudflare candidate outright, because providers
 * do not agree on format and review files now carry the native extension. And
 * `find` returns the FIRST match, so where #63 asked for N candidates side by
 * side it renders one. Together they produce a sheet that looks complete, shows
 * only Pollinations, and says nothing — a human would approve a bake-off they
 * never saw.
 *
 * ── What a grid has to be honest about ──────────────────────────────────────
 * Three absences, and none of them may be silent:
 *
 *   - a MISSING cell — that provider has no candidate for that card, because its
 *     lane died, was never run, or the card was already published and so was
 *     never part of the bake-off (this reads no database, deliberately, so it
 *     cannot tell those apart and says so instead of implying one). #63's grid
 *     is only readable if a blank cell is distinguishable from a provider that
 *     drew badly.
 *
 *     An escape hatch (#71) is exempt from the COUNT but not from the GRID. It
 *     sits out the fan-out by design, so it is blank for almost every card —
 *     that is the arrangement working. Counting those blanks would fire the "N
 *     candidate(s) missing" banner on every sheet forever, which teaches a
 *     reviewer to ignore the one warning that says a lane died. Its column still
 *     renders, because a hatch that WAS invoked for a card has to be visible
 *     beside the lanes it beat.
 *   - an UNPICKED row — no `provider` resolved, so `--sync` will refuse the card.
 *     Better learned here than at the publish gate.
 *   - an ORPHAN file — a candidate on disk belonging to no registered provider,
 *     left by a rename or a retirement. Column-driven rendering would hide it,
 *     so the files are counted independently and reported.
 *
 * Pure: `planContactSheet` takes its filesystem as callbacks, so the grid logic
 * is testable and the script stays a thin shell.
 */
import { slug } from "./keys";
import { reviewFileName, resolveProviderId, type NamingProvider } from "./review-files";
import {
  COVER_SUBJECT_NAME,
  cardSubject,
  coverSubject,
  type Subject,
} from "./prompt";
import type { ProviderRole } from "./providers/provider";

/**
 * What the grid needs to know about a provider: how to name its file, and
 * whether a blank cell is a gap or the arrangement working.
 *
 * `role` is required rather than optional-with-a-default for the reason
 * `reviewKey`'s provider segment is: an optional one would silently count a
 * hatch as a lane, which is the exact miscount this type exists to prevent.
 */
export type SheetProvider = NamingProvider & { role: ProviderRole };

/** Display order — legendary first, so the cards that matter most are seen first. */
const RARITY_ORDER: Record<string, number> = {
  legendary: 0,
  epic: 1,
  rare: 2,
  common: 3,
};

export interface SheetCard {
  name: string;
  rarity: string;
  eduText: string;
  imagePrompt: string;
  provider?: string;
}

export interface SheetTheme {
  name: string;
  provider?: string;
  /** The theme's cover prompt (#122) — screened as the sheet's first row. */
  coverPrompt: string;
  cards: readonly SheetCard[];
}

export interface SheetCandidate {
  providerId: string;
  fileName: string;
  present: boolean;
  /** What the response NAMED, from the sidecar — not what was requested (#64). */
  model?: string;
  /** Is this the candidate `--sync` would publish? */
  isPick: boolean;
}

export interface SheetRow {
  name: string;
  rarity: string;
  eduText: string;
  resolvedProvider?: string;
  candidates: SheetCandidate[];
}

export interface ContactSheet {
  theme: string;
  providerIds: string[];
  /** Of those, the ones that sit out the fan-out (#71) — expected to be sparse. */
  escapeHatchIds: string[];
  rows: SheetRow[];
  /** (card, provider) pairs with no candidate on disk. */
  missing: number;
  /** Cards with no provider resolved — `--sync` would refuse these. */
  unpicked: number;
  /** Candidate files for this theme belonging to no registered provider. */
  orphans: string[];
}

export interface SheetDeps {
  exists(fileName: string): boolean;
  /** Sidecar contents, or undefined when absent/unreadable. */
  readSidecar(fileName: string): { model?: string } | undefined;
  /** Everything in the review directory, for orphan detection. */
  listFiles(): readonly string[];
}

/**
 * @param siblingThemeNames Every OTHER theme in the seed. A review filename is
 * `<themeSlug>-<cardSlug>-…` and both halves may contain dashes, so a bare
 * prefix match cannot tell `ocean-machines-alvin-…` (a card of "Ocean Machines")
 * from a card named "Machines Alvin" in a theme called "Ocean". Without the
 * sibling names, the shorter-slugged theme claims every candidate of the longer
 * one as an orphan. Knowing them is the only way to disambiguate, so they are an
 * input rather than something to guess at.
 */
export function planContactSheet(
  theme: SheetTheme,
  providers: readonly SheetProvider[],
  deps: SheetDeps,
  siblingThemeNames: readonly string[] = [],
): ContactSheet {
  const expected = new Set<string>();
  let missing = 0;
  let unpicked = 0;

  // The cover leads the sheet (#122). It is screened by the same human in the
  // same sitting as the 30 cards, and it is the picture a child meets FIRST, so
  // it is the first row rather than an appendix — and it is judged against the
  // cards it will front rather than in isolation, which is the only way to see
  // that a cover reads as a place and its cards read as specimens.
  //
  // It has no rarity, so it sorts nowhere: it is prepended rather than mixed in,
  // and `rarity` carries the literal subject name so the rendered sheet labels
  // the row instead of showing an empty rarity cell.
  const subjects: Array<{ row: Omit<SheetRow, "candidates" | "resolvedProvider">; subject: Subject; provider?: string }> = [
    {
      row: { name: COVER_SUBJECT_NAME, rarity: COVER_SUBJECT_NAME.toLowerCase(), eduText: theme.coverPrompt },
      subject: coverSubject(theme),
      provider: theme.provider,
    },
    ...[...theme.cards]
      .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9))
      .map((card) => ({
        row: { name: card.name, rarity: card.rarity, eduText: card.eduText },
        subject: cardSubject(card),
        provider: resolveProviderId(theme, card),
      })),
  ];

  const rows: SheetRow[] = subjects
    .map(({ row, subject, provider: resolved }) => {
      if (resolved === undefined) unpicked++;

      const candidates = providers.map((provider): SheetCandidate => {
        const fileName = reviewFileName(theme.name, subject, provider);
        expected.add(fileName);
        const present = deps.exists(fileName);
        // A hatch's blank is not a gap — see the header note.
        if (!present && provider.role === "lane") missing++;
        return {
          providerId: provider.id,
          fileName,
          present,
          model: present
            ? deps.readSidecar(fileName.replace(/\.[^.]+$/, ".json"))?.model
            : undefined,
          isPick: provider.id === resolved,
        };
      });

      return { ...row, resolvedProvider: resolved, candidates };
    });

  // Orphans are found by scanning rather than by column, because a column can
  // only ever show providers that still exist. A file another theme's longer
  // slug also claims is that theme's business, not this one's.
  const prefix = `${slug(theme.name)}-`;
  const claimedElsewhere = siblingThemeNames
    .map((n) => `${slug(n)}-`)
    .filter((p) => p.length > prefix.length);
  const orphans = deps
    .listFiles()
    .filter(
      (f) =>
        f.startsWith(prefix) &&
        !claimedElsewhere.some((p) => f.startsWith(p)) &&
        !f.endsWith(".json") &&
        !f.endsWith(".html") &&
        !expected.has(f),
    )
    .sort();

  return {
    theme: theme.name,
    providerIds: providers.map((p) => p.id),
    escapeHatchIds: providers.filter((p) => p.role === "escape-hatch").map((p) => p.id),
    rows,
    missing,
    unpicked,
    orphans,
  };
}

/** Render a contact sheet as markdown for the bake-off review comment. */
/**
 * One sheet of COVERS across many themes (#122) — the backfill's checkpoint 2.
 *
 * `planContactSheet` is per-theme, which is right for a new theme: 31 rows, all
 * of them freshly generated. It is wrong for filling in covers for themes that
 * already shipped, where it renders 30 blank rows for published cards it cannot
 * know are published, and buries the one row that matters. Sixteen of those is
 * not a checkpoint anyone can actually read.
 *
 * So the covers get one page: one row per theme, one column per provider, which
 * is also the only way to see the thing that most needs seeing here — whether
 * sixteen covers read as sixteen DIFFERENT places. A cover judged alone can look
 * fine and still be the third grassy hilltop in the grid.
 *
 * Same `ContactSheet` shape, so `renderContactSheet` is untouched: `name` is the
 * theme, `rarity` is the literal subject name, and `eduText` carries the
 * authored prompt so a human can see the words each picture answers.
 *
 * Orphans are not computed. Detection is per-theme-prefix and this sheet spans
 * every theme, so every theme's files would claim every other's; the per-theme
 * sheet remains the place that question is asked.
 */
export function planCoverSheet(
  themes: readonly SheetTheme[],
  providers: readonly SheetProvider[],
  deps: SheetDeps,
): ContactSheet {
  let missing = 0;
  let unpicked = 0;

  const rows: SheetRow[] = themes.map((theme) => {
    const resolved = theme.provider;
    if (resolved === undefined) unpicked++;
    const subject = coverSubject(theme);

    return {
      name: theme.name,
      rarity: COVER_SUBJECT_NAME.toLowerCase(),
      eduText: theme.coverPrompt,
      resolvedProvider: resolved,
      candidates: providers.map((provider): SheetCandidate => {
        const fileName = reviewFileName(theme.name, subject, provider);
        const present = deps.exists(fileName);
        if (!present && provider.role === "lane") missing++;
        return {
          providerId: provider.id,
          fileName,
          present,
          model: present
            ? deps.readSidecar(fileName.replace(/\.[^.]+$/, ".json"))?.model
            : undefined,
          isPick: provider.id === resolved,
        };
      }),
    };
  });

  return {
    theme: `${themes.length} theme cover(s)`,
    providerIds: providers.map((p) => p.id),
    escapeHatchIds: providers.filter((p) => p.role === "escape-hatch").map((p) => p.id),
    rows,
    missing,
    unpicked,
    orphans: [],
  };
}

export function renderContactSheet(sheet: ContactSheet): string {
  const cols = sheet.providerIds.length;
  const banner = [
    sheet.unpicked > 0
      ? `<p class="warn">⚠ ${sheet.unpicked} card(s) have no provider chosen. <code>--sync</code> will refuse them until a <code>provider</code> is set on the card or the theme.</p>`
      : "",
    sheet.missing > 0
      ? `<p class="warn">⚠ ${sheet.missing} lane cell(s) have no candidate on disk. A blank cell means that lane produced nothing for that card — a dead lane, a run that was narrowed, or a card <code>--review</code> never generated because it is already published — NOT that it drew badly.</p>`
      : "",
    sheet.escapeHatchIds.length > 0
      ? `<p class="sub">${sheet.escapeHatchIds.map(esc).join(", ")} ${sheet.escapeHatchIds.length === 1 ? "is an escape hatch" : "are escape hatches"} (#71): not part of the fan-out, so blank is the normal state. A filled cell there means someone invoked it deliberately for that card.</p>`
      : "",
    sheet.orphans.length > 0
      ? `<p class="warn">⚠ ${sheet.orphans.length} file(s) in seed/review/ belong to no registered provider (a rename or a retirement): ${sheet.orphans.map(esc).join(", ")}</p>`
      : "",
  ].join("");

  const rows = sheet.rows
    .map(
      (row) => `<tr>
<th scope="row"><b>${esc(row.name)}</b><div class="r">${esc(row.rarity)}</div>
<div class="e">${esc(row.eduText)}</div>
<div class="p">${row.resolvedProvider ? `pick: ${esc(row.resolvedProvider)}` : `<span class="miss">no pick</span>`}</div></th>
${row.candidates
  .map(
    (c) => `<td class="${c.isPick ? "pick" : ""}">${
      c.present
        ? `<img src="${esc(c.fileName)}" loading="lazy" alt="${esc(row.name)} by ${esc(c.providerId)}">`
        : `<div class="miss">MISSING</div>`
    }<div class="m">${esc(c.model ?? (c.present ? "model not reported" : ""))}</div></td>`,
  )
  .join("")}
</tr>`,
    )
    .join("\n");

  return `<!doctype html><meta charset=utf-8><title>${esc(sheet.theme)} — review</title>
<style>
body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:20px;margin:0 0 4px}
.sub{opacity:.6;margin:0 0 16px}
.warn{background:#3a2410;border-left:3px solid #d78c33;padding:8px 12px;margin:8px 0}
table{border-collapse:collapse;width:100%}
th,td{vertical-align:top;padding:8px;border-top:1px solid #2a2a2a}
thead th{position:sticky;top:0;background:#111;text-align:left;font-size:12px;
  text-transform:uppercase;letter-spacing:.08em;opacity:.7}
th[scope=row]{text-align:left;width:220px;font-weight:400}
td{width:calc((100% - 220px)/${cols || 1})}
img{width:100%;border-radius:8px;display:block;background:#222}
.r{opacity:.6;text-transform:uppercase;font-size:11px;letter-spacing:.08em;margin-top:4px}
.e{opacity:.8;margin-top:6px}
.p{margin-top:6px;font-size:12px;opacity:.8}
.m{font-size:11px;opacity:.55;margin-top:4px}
.hatch{font-size:10px;opacity:.6;font-weight:400;letter-spacing:.04em;margin-top:3px}
.miss{color:#f66;border:1px dashed #f66;border-radius:8px;padding:24px;text-align:center}
td.pick{outline:2px solid #6c9;outline-offset:-2px;border-radius:8px}
</style>
<h1>${esc(sheet.theme)} — ${sheet.rows.length} card(s) in the seed</h1>
<p class="sub">Every card this theme declares in <code>seed/cards.json</code>, not just the unpublished ones — this sheet reads no database. One row per subject, one column per provider. The outlined cell is what <code>--sync</code> would publish.</p>
${banner}
<table>
<thead><tr><th>Card</th>${sheet.providerIds
    .map(
      (p) =>
        `<th>${esc(p)}${
          sheet.escapeHatchIds.includes(p) ? `<div class="hatch">escape hatch</div>` : ""
        }</th>`,
    )
    .join("")}</tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
