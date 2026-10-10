/**
 * The `pnpm theme-images` review table — one row per card, both providers'
 * candidates side by side, the judge's recommendation badged and reasoned.
 *
 * Alongside `pnpm contact-sheet` (`contact-sheet.ts`) rather than a change to
 * it: that sheet is the full subject x every-registered-provider bake-off
 * grid driving Step 7's human pick, where this is a two-column advisory page
 * scoped to exactly the lanes `pnpm theme-images` just ran. Nothing here is
 * written to `seed-content/cards.json` and nothing here is a `--sync` input —
 * the badge is a recommendation, not a pick.
 *
 * Pure — no I/O — so the CLI stays a thin shell around `renderJudgeTable`.
 */
import type { JudgeOutcome } from "./judge";

export interface JudgeTableCandidate {
  providerId: string;
  /** Review-dir-relative file name, or undefined when this provider has no candidate at all. */
  fileName?: string;
}

export interface JudgeTableRow {
  name: string;
  rarity: string;
  imagePrompt: string;
  candidates: readonly JudgeTableCandidate[];
  outcome: JudgeOutcome;
}

export interface JudgeTable {
  theme: string;
  rows: readonly JudgeTableRow[];
}

function outcomeNote(outcome: JudgeOutcome): string {
  switch (outcome.status) {
    case "missing":
      return `<span class="miss">no candidates</span>`;
    case "single":
      return `<span class="sub">only one candidate — ${esc(outcome.reason)}</span>`;
    case "cached":
      return `<span class="sub">judged (cached) — ${esc(outcome.reason)}</span>`;
    case "judged":
      return `<span class="sub">judged — ${esc(outcome.reason)}</span>`;
    case "unjudged":
      return `<span class="warn-inline">unjudged — ${esc(outcome.reason)}</span>`;
  }
}

function winnerId(outcome: JudgeOutcome): string | undefined {
  return outcome.status === "missing" || outcome.status === "unjudged" ? undefined : outcome.winner;
}

export function renderJudgeTable(table: JudgeTable): string {
  const unjudged = table.rows.filter((r) => r.outcome.status === "unjudged").length;
  const missing = table.rows.filter((r) => r.outcome.status === "missing").length;

  const rows = table.rows
    .map((row) => {
      const winner = winnerId(row.outcome);
      const cells = row.candidates
        .map((c) => {
          const isWinner = winner !== undefined && c.providerId === winner;
          const body = c.fileName
            ? `<img src="${esc(c.fileName)}" loading="lazy" alt="${esc(row.name)} by ${esc(c.providerId)}">`
            : `<div class="miss">no candidate</div>`;
          return `<td class="${isWinner ? "pick" : ""}">
${isWinner ? `<div class="badge">Recommended</div>` : ""}
${body}
<div class="p">${esc(c.providerId)}</div>
</td>`;
        })
        .join("");
      return `<tr>
<th scope="row"><b>${esc(row.name)}</b><div class="r">${esc(row.rarity)}</div></th>
${cells}
<td class="note">${outcomeNote(row.outcome)}</td>
</tr>`;
    })
    .join("\n");

  const providerIds = [...new Set(table.rows.flatMap((r) => r.candidates.map((c) => c.providerId)))];

  return `<!doctype html><meta charset=utf-8><title>${esc(table.theme)} — image judge</title>
<style>
body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:20px;margin:0 0 4px}
.sub{opacity:.6}
.warn{background:#3a2410;border-left:3px solid #d78c33;padding:8px 12px;margin:8px 0}
.warn-inline{color:#d78c33}
table{border-collapse:collapse;width:100%}
th,td{vertical-align:top;padding:8px;border-top:1px solid #2a2a2a}
thead th{position:sticky;top:0;background:#111;text-align:left;font-size:12px;
  text-transform:uppercase;letter-spacing:.08em;opacity:.7}
th[scope=row]{text-align:left;width:200px;font-weight:400}
td.note{width:260px;font-size:12px}
img{width:100%;border-radius:8px;display:block;background:#222}
.r{opacity:.6;text-transform:uppercase;font-size:11px;letter-spacing:.08em;margin-top:4px}
.p{font-size:11px;opacity:.55;margin-top:4px;text-align:center}
.miss{color:#f66;border:1px dashed #f66;border-radius:8px;padding:24px;text-align:center}
td.pick{outline:2px solid #6c9;outline-offset:-2px;border-radius:8px}
.badge{background:#6c9;color:#113;font-size:11px;font-weight:600;letter-spacing:.04em;
  text-transform:uppercase;border-radius:4px;padding:2px 6px;display:inline-block;margin-bottom:4px}
</style>
<h1>${esc(table.theme)} — image judge (advisory)</h1>
<p class="sub">One row per card, one column per provider this run generated through. "Recommended" is the
local <code>claude</code> CLI's advisory pick against the card's prompt and the runbook's rejection
criteria — it is not written to <code>seed-content/cards.json</code> and <code>--sync</code> never reads it.
Record the human pick at Step 8 as usual.</p>
${
  unjudged + missing > 0
    ? `<p class="warn">⚠ ${missing} card(s) have no candidate at all, ${unjudged} card(s) could not be judged (see each row's note).</p>`
    : ""
}
<table>
<thead><tr><th>Card</th>${providerIds.map((p) => `<th>${esc(p)}</th>`).join("")}<th>Judge</th></tr></thead>
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
