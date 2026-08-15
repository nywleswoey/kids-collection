/**
 * Throwaway prototype for #66 — do the new providers draw the hard subjects?
 *
 *   pnpm prototype:66
 *
 * NOT part of the product. It exists to produce evidence a human judges at the
 * contact sheet, and should be deleted once #66 is resolved.
 *
 * ── Why a prototype rather than `pnpm seed --review` ─────────────────────────
 * `--review` only generates for cards the pool has not published, and every
 * subject worth testing here is a *Warriors* card that already shipped. Adding a
 * scratch theme to `seed/cards.json` would mean inventing 30 cards to satisfy
 * the schema's pyramid, and would put throwaway data in a version-controlled
 * file the runbook treats as authoritative. So this drives the shipped seam
 * directly — the real adapters, the real `buildPrompt`, the real `runBakeOff`,
 * the real contact-sheet renderer — over a handful of subjects.
 *
 * ── The subjects, and why these ─────────────────────────────────────────────
 * `seed/NEW-THEME-RUNBOOK.md` documents three failure classes as unfixable at
 * any wording, each with named casualties from the *Warriors* run that returned
 * 3 usable images out of 28. One subject per class, plus a second multi-object
 * case, plus two controls.
 *
 * The prompts are the ones that ACTUALLY SHIPPED, read from `seed/cards.json` —
 * not prompts invented for this test. That matters: the runbook's first wording
 * lever ("lead with the defining object") is already visibly applied in them, so
 * these are round-2/3 prompts, the best wording anyone found. If a provider
 * draws them, it draws them where the incumbent failed with every advantage.
 *
 * ── The controls do real work (#62, #66's own comment) ──────────────────────
 * #64 caught Pollinations silently swapping its model to `sana`, which means
 * *Warriors*' 3-of-28 may be a fact about `sana` rather than about free image
 * generation. A control subject that Pollinations draws well says the model is
 * bad at these classes specifically; a control it also fumbles says it is bad at
 * everything, and the comparison means something different.
 *
 * ── Refusals are DATA, not errors (#62 §8, #66's own comment) ───────────────
 * Cloudflare runs an undocumented, non-disablable NSFW input filter that answers
 * error 3030 and is reported to fire on words as innocent as "hamburger". The
 * runbook explicitly permits visible weaponry, and these subjects carry a bow, a
 * halberd and a chariot. If that filter refuses weapon-bearing prompts,
 * Cloudflare fails this app's content requirements however well it draws — a
 * finding worth as much as the images. So every refusal is captured verbatim,
 * tallied per provider, and printed.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPrompt } from "@/features/pool/prompt";
import { runBakeOff, type BakeOffJob } from "@/features/pool/bake-off";
import { reviewFileName, sidecarFileName, buildSidecar } from "@/features/pool/review-files";
import { planContactSheet, renderContactSheet } from "@/features/pool/contact-sheet";
import { CARD_SIZE, LANES, type ImageProvider } from "@/features/pool/providers";

const OUT = join(process.cwd(), "seed", "bakeoff-66");
const SEED = join(process.cwd(), "seed", "cards.json");
const THEME = "Warriors";

/** One subject per documented failure class, plus controls. */
const SUBJECTS: { card: string; role: string; why: string }[] = [
  { card: "Longbowman", role: "hard", why: "small held object — rendered as a bent wire" },
  { card: "Swiss Guard", role: "hard", why: "niche uniform accuracy — came back modern police" },
  { card: "Egyptian Charioteer", role: "hard", why: "multi-object scene — a Victorian pony-trap" },
  { card: "Terracotta Army", role: "hard", why: "multi-object scene — one figurine, not an army" },
  { card: "Samurai", role: "control", why: "iconic, single figure — no failure class applies" },
  { card: "Viking Warrior", role: "control", why: "iconic, single figure — no failure class applies" },
];

interface Refusal {
  provider: string;
  card: string;
  prompt: string;
  error: string;
}

async function main() {
  const seed = JSON.parse(readFileSync(SEED, "utf8")) as {
    themes: { name: string; cards: { name: string; rarity: string; eduText: string; imagePrompt: string }[] }[];
  };
  const theme = seed.themes.find((t) => t.name === THEME);
  if (!theme) throw new Error(`no theme "${THEME}" in seed/cards.json`);

  const cards = SUBJECTS.map((s) => {
    const card = theme.cards.find((c) => c.name === s.card);
    if (!card) throw new Error(`no card "${s.card}" in ${THEME}`);
    return { ...card, role: s.role, why: s.why };
  });

  // Fresh every run: this is evidence for one judgement, not a resumable review.
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const lanes = LANES.filter((p) => p.isConfigured());
  const unconfigured = LANES.filter((p) => !p.isConfigured());
  if (unconfigured.length > 0) {
    console.error(
      `⛔ ${unconfigured.length} lane(s) unconfigured: ` +
        unconfigured.map((p) => `${p.id} (needs ${p.requiredEnv.join(", ")})`).join("; ") +
        `\n   A bake-off missing a lane proves nothing. Set the keys and re-run.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Bake-off #66 — ${cards.length} subjects x ${lanes.length} providers = ${cards.length * lanes.length} images\n` +
      `Providers: ${lanes.map((p) => `${p.id} (${p.concurrency}w @ ${p.minIntervalMs}ms)`).join(", ")}\n`,
  );
  for (const c of cards) console.log(`  ${c.role === "hard" ? "HARD   " : "control"}  ${c.name} — ${c.why}`);
  console.log("");

  const refusals: Refusal[] = [];
  const jobs: BakeOffJob<(typeof cards)[number]>[] = cards.map((card) => ({ theme: THEME, card }));

  const started = Date.now();
  const outcomes = await runBakeOff(jobs, lanes, {
    size: CARD_SIZE,
    retries: 2,
    buildPrompt: (card) => buildPrompt(card),
    isReviewed: () => false,
    save: (job, provider, image) => {
      writeFileSync(join(OUT, reviewFileName(job.theme, job.card, provider)), image.bytes);
      writeFileSync(
        join(OUT, sidecarFileName(job.theme, job.card, provider)),
        `${JSON.stringify(buildSidecar(provider, image), null, 2)}\n`,
      );
    },
    log: (m) => console.log(m),
    warn: (m) => console.warn(m),
    error: (m) => {
      console.error(m);
      // Capture refusals as data. The runner reports one line per failed job;
      // parse the provider and card back out so the tally is per (provider, card).
      const match = /\s*✗\s+(.+?)\s+\/\s+(.+?)\s+\[(.+?)\]:\s*(.*)$/.exec(m);
      if (!match) return;
      const [, , cardName, providerId, error] = match;
      const card = cards.find((c) => c.name === cardName);
      refusals.push({
        provider: providerId,
        card: cardName,
        prompt: card ? buildPrompt(card) : "(unknown)",
        error,
      });
    },
  });
  const elapsed = Math.round((Date.now() - started) / 1000);

  // ── the contact sheet, through the shipped renderer ────────────────────────
  const sheetTheme = {
    name: THEME,
    cards: cards.map((c) => ({
      name: c.name,
      rarity: c.rarity,
      eduText: `[${c.role.toUpperCase()}] ${c.why}`,
      imagePrompt: c.imagePrompt,
    })),
  };
  const files = cards.flatMap((c) => lanes.map((p) => reviewFileName(THEME, c, p)));
  const present = new Set(
    files.filter((f) => {
      try {
        return readFileSync(join(OUT, f)).byteLength > 0;
      } catch {
        return false;
      }
    }),
  );
  const sheet = planContactSheet(
    sheetTheme,
    lanes,
    {
      exists: (f) => present.has(f),
      readSidecar: (f) => {
        try {
          return JSON.parse(readFileSync(join(OUT, f), "utf8")) as { model?: string };
        } catch {
          return undefined;
        }
      },
      listFiles: () => [...present],
    },
    seed.themes.map((t) => t.name).filter((n) => n !== THEME),
  );
  const html = join(OUT, "bakeoff-66.html");
  writeFileSync(html, renderContactSheet(sheet));

  // ── report ────────────────────────────────────────────────────────────────
  console.log(`\n── Result (${elapsed}s wall-clock) ──`);
  for (const o of outcomes) {
    console.log(
      `  ${o.providerId.padEnd(16)} drew ${o.generated}/${jobs.length}` +
        (o.failed ? `, failed ${o.failed}` : "") +
        (o.abandoned ? `, LANE ABANDONED (${o.notAttempted} not attempted)` : ""),
    );
  }

  console.log(`\n── Refusals (data, not errors) ──`);
  if (refusals.length === 0) {
    console.log("  none — no provider refused any prompt");
  } else {
    const byProvider = new Map<string, Refusal[]>();
    for (const r of refusals) byProvider.set(r.provider, [...(byProvider.get(r.provider) ?? []), r]);
    for (const [provider, rs] of byProvider) {
      console.log(`  ${provider}: ${rs.length} refused`);
      for (const r of rs) {
        console.log(`     ${r.card}\n       error : ${r.error}\n       prompt: ${r.prompt}`);
      }
    }
    writeFileSync(join(OUT, "refusals.json"), `${JSON.stringify(refusals, null, 2)}\n`);
  }

  console.log(`\n→ ${html}`);
  console.log(`  ${present.size}/${files.length} cells have an image.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
