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
 *
 * The page is also interactive, entirely client-side (no server, no build
 * step): each row with at least one candidate gets a `<select>` of the
 * providers that actually have one, preselected to the judge's
 * recommendation when there is one. A script renders a ready-to-copy `pnpm
 * theme-picks "<Theme>" --use "<Card>=<id>" ...` command reflecting the
 * current selections: a `--use` for every row whose selection is not that
 * row's own recommendation (or that has no recommendation at all), since
 * `theme-picks` defaults every other card to its recommendation and derives
 * the theme's majority itself. A
 * row with no candidate at all has no `<select>` and is never included in
 * that command; running it still leaves that card refused by `theme-picks`,
 * same as it would be unresolved from the CLI alone.
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

export interface PickSelection {
  name: string;
  /** The provider currently selected for this row; undefined for a row with no candidate to pick. */
  providerId?: string;
  /** This row's judge recommendation; undefined when the row is unjudged or has no candidate. */
  recommended?: string;
}

/** Double-quoted, shell-escaped — matches the inline script's `kcShellQuote` byte for byte. */
function shellQuote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Build the `pnpm theme-picks` command for the current per-row selections:
 * every selection that differs from its own row's recommendation (or whose
 * row has none) becomes a `--use "<name>=<id>"`. `deriveThemePicks`
 * (`src/shared/pool/theme-picks.ts`) gives every other card its
 * recommendation, so the command reproduces exactly these selections. A row
 * with no selection (`providerId` undefined — no candidate at all) is left
 * out entirely.
 *
 * Pure, so this is what both the server-rendered initial command and the
 * test suite exercise directly; the page's inline script re-implements the
 * same algorithm in plain JS (no bundler to share this with the browser) to
 * recompute it as the human changes a dropdown — keep the two in sync.
 */
export function buildPickCommand(theme: string, selections: readonly PickSelection[]): string {
  let cmd = `pnpm theme-picks ${shellQuote(theme)}`;
  for (const s of selections) {
    if (s.providerId !== undefined && s.providerId !== s.recommended) {
      cmd += ` --use ${shellQuote(`${s.name}=${s.providerId}`)}`;
    }
  }
  return cmd;
}

export function renderJudgeTable(table: JudgeTable): string {
  const unjudged = table.rows.filter((r) => r.outcome.status === "unjudged").length;
  const missing = table.rows.filter((r) => r.outcome.status === "missing").length;

  const rows = table.rows
    .map((row, rowIndex) => {
      const winner = winnerId(row.outcome);
      const available = row.candidates.filter((c) => c.fileName !== undefined);
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
      const picker =
        available.length > 0
          ? `<select class="pick-select" data-card="${esc(row.name)}" data-row="${rowIndex}" onchange="kcRecompute()">
${available
  .map(
    (c) =>
      `<option value="${esc(c.providerId)}" ${c.providerId === winner ? "selected" : ""}>${esc(c.providerId)}</option>`,
  )
  .join("")}
</select>`
          : `<span class="sub">no candidate — not pickable</span>`;
      return `<tr>
<th scope="row"><b>${esc(row.name)}</b><div class="r">${esc(row.rarity)}</div></th>
${cells}
<td class="note">${outcomeNote(row.outcome)}<div class="picker">${picker}</div></td>
</tr>`;
    })
    .join("\n");

  const providerIds = [...new Set(table.rows.flatMap((r) => r.candidates.map((c) => c.providerId)))];

  const initialSelections: PickSelection[] = table.rows.map((row) => {
    const available = row.candidates.filter((c) => c.fileName !== undefined);
    const winner = winnerId(row.outcome);
    return { name: row.name, providerId: winner ?? available[0]?.providerId, recommended: winner };
  });
  const initialCommand = buildPickCommand(table.theme, initialSelections);

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
.picker{margin-top:6px}
select.pick-select{background:#1b1b1b;color:#eee;border:1px solid #333;border-radius:4px;padding:2px 4px;font-size:12px}
#cmd-box{position:sticky;top:0;background:#182018;border:1px solid #2a3a2a;border-radius:8px;padding:10px 12px;margin:8px 0 16px;z-index:1}
#cmd-text{display:block;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,monospace;font-size:12px;margin:6px 0}
#cmd-copy{background:#2a3a2a;color:#9c6;border:1px solid #3a4a3a;border-radius:4px;padding:4px 10px;font-size:12px;cursor:pointer}
#cmd-copy:hover{background:#344434}
</style>
<h1>${esc(table.theme)} — image judge (advisory)</h1>
<p class="sub">One row per card, one column per provider this run generated through. "Recommended" is the
local <code>claude</code> CLI's advisory pick against the card's prompt and the runbook's rejection
criteria — it is not written to <code>seed-content/cards.json</code> and <code>--sync</code> never reads it.
Switch any row's pick with its dropdown; the command below updates to match. Run it (Step 8), review the
diff, commit, then Step 9 as usual.</p>
${
  unjudged + missing > 0
    ? `<p class="warn">⚠ ${missing} card(s) have no candidate at all, ${unjudged} card(s) could not be judged (see each row's note). A card with no candidate cannot be included in the generated command — re-run the image lanes first. An unjudged card's dropdown pick is always included as its own --use, so check it before running.</p>`
    : ""
}
<div id="cmd-box">
<b>Copy-ready command</b>
<code id="cmd-text">${escText(initialCommand)}</code>
<button id="cmd-copy" type="button" onclick="kcCopyCommand()">Copy</button>
</div>
<table>
<thead><tr><th>Card</th>${providerIds.map((p) => `<th>${esc(p)}</th>`).join("")}<th>Judge</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<script>
var KC_THEME = ${jsonForScript(table.theme)};
var KC_ROWS = ${jsonForScript(table.rows.map((r) => ({ name: r.name, recommended: winnerId(r.outcome) ?? null })))};

function kcShellQuote(s) {
  return '"' + String(s).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"') + '"';
}

function kcRecompute() {
  var selects = document.querySelectorAll(".pick-select");
  var picks = {};
  selects.forEach(function (sel) {
    picks[sel.getAttribute("data-card")] = sel.value;
  });

  var cmd = "pnpm theme-picks " + kcShellQuote(KC_THEME);
  KC_ROWS.forEach(function (row) {
    var id = picks[row.name];
    if (id !== undefined && id !== row.recommended) {
      cmd += " --use " + kcShellQuote(row.name + "=" + id);
    }
  });
  document.getElementById("cmd-text").textContent = cmd;
}

function kcCopyCommand() {
  var text = document.getElementById("cmd-text").textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(text);
}

kcRecompute();
</script>`;
}

/** JSON-encode a value for embedding inside an inline `<script>` block — escapes `</` so no card name or theme name can close the tag early. */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, "<\\/");
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Escapes a string for an HTML text node (no attribute, so quotes need no escaping). */
function escText(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}
