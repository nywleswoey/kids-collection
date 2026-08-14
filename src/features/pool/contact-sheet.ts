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
 *     lane died or was never run. #63's grid is only readable if a blank cell is
 *     distinguishable from a provider that drew badly.
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

export function planContactSheet(
  theme: SheetTheme,
  providers: readonly NamingProvider[],
  deps: SheetDeps,
): ContactSheet {
  const expected = new Set<string>();
  let missing = 0;
  let unpicked = 0;

  const rows: SheetRow[] = [...theme.cards]
    .sort((a, b) => (RARITY_ORDER[a.rarity] ?? 9) - (RARITY_ORDER[b.rarity] ?? 9))
    .map((card) => {
      const resolved = resolveProviderId(theme, card);
      if (resolved === undefined) unpicked++;

      const candidates = providers.map((provider): SheetCandidate => {
        const fileName = reviewFileName(theme.name, card, provider);
        expected.add(fileName);
        const present = deps.exists(fileName);
        if (!present) missing++;
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

      return {
        name: card.name,
        rarity: card.rarity,
        eduText: card.eduText,
        resolvedProvider: resolved,
        candidates,
      };
    });

  // Orphans are found by scanning rather than by column, because a column can
  // only ever show providers that still exist.
  const prefix = `${slug(theme.name)}-`;
  const orphans = deps
    .listFiles()
    .filter(
      (f) =>
        f.startsWith(prefix) &&
        !f.endsWith(".json") &&
        !f.endsWith(".html") &&
        !expected.has(f),
    )
    .sort();

  return {
    theme: theme.name,
    providerIds: providers.map((p) => p.id),
    rows,
    missing,
    unpicked,
    orphans,
  };
}

export function renderContactSheet(sheet: ContactSheet): string {
  const cols = sheet.providerIds.length;
  const banner = [
    sheet.unpicked > 0
      ? `<p class="warn">⚠ ${sheet.unpicked} card(s) have no provider chosen. <code>--sync</code> will refuse them until a <code>provider</code> is set on the card or the theme.</p>`
      : "",
    sheet.missing > 0
      ? `<p class="warn">⚠ ${sheet.missing} candidate(s) missing. A blank cell means that provider produced nothing for that card — a dead lane or a run that was narrowed — NOT that it drew badly.</p>`
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
.miss{color:#f66;border:1px dashed #f66;border-radius:8px;padding:24px;text-align:center}
td.pick{outline:2px solid #6c9;outline-offset:-2px;border-radius:8px}
</style>
<h1>${esc(sheet.theme)} — ${sheet.rows.length} new cards</h1>
<p class="sub">One row per subject, one column per provider. The outlined cell is what <code>--sync</code> would publish.</p>
${banner}
<table>
<thead><tr><th>Card</th>${sheet.providerIds.map((p) => `<th>${esc(p)}</th>`).join("")}</tr></thead>
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
