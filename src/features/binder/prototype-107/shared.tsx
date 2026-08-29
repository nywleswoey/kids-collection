"use client";

/**
 * PROTOTYPE — #107. Throwaway. Do not import from production code.
 *
 * Bits every variant is allowed to reuse: the chip button (it is the app's
 * existing one, lifted verbatim from GalaxyView), the two chip rows that #107
 * does NOT replace (mode + rarity — their placement is #108's call, but they
 * have to be on screen or the density judgement is a lie), and a helper that
 * inflates the real 16 themes to 25/32 so each take can be judged at double
 * today's count, as the ticket demands.
 *
 * Deliberately NOT shared: layout. Each variant throws out the page shape.
 */

import type { ReactNode } from "react";
import { RARITIES, type Rarity } from "@/lib/types";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { RARITY_META } from "@/features/card/rarity";
import type { RarityCount } from "../rarity-filter";

export function TabChip({
  label,
  active,
  onClick,
  testid,
  frame,
  className = "",
}: {
  label: ReactNode;
  active: boolean;
  onClick: () => void;
  testid: string;
  frame?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testid}
      style={active && frame ? { background: frame, color: "#000" } : undefined}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--brand-1)] text-black ring-2 ring-[color:var(--brand-1)]"
          : "bg-white/10 text-[color:var(--ink)] hover:bg-white/20"
      } ${className}`}
    >
      {label}
    </button>
  );
}

/** The mode row, unchanged from today. #108 decides where it really lives. */
export function ModeRow({
  mode,
  setMode,
  burnableCount,
}: {
  mode: "all" | "sacrifice";
  setMode: (m: "all" | "sacrifice") => void;
  burnableCount: number;
}) {
  return (
    <div data-testid="galaxy-mode-filter" className="flex flex-wrap gap-2">
      <TabChip
        label="🌌 All cards"
        active={mode === "all"}
        onClick={() => setMode("all")}
        testid="galaxy-mode-all"
      />
      <TabChip
        label={`🔥 Ready to sacrifice ${burnableCount}`}
        active={mode === "sacrifice"}
        onClick={() => setMode("sacrifice")}
        testid="galaxy-mode-sacrifice"
        frame="#f97316"
      />
    </div>
  );
}

/** The rarity row, unchanged from today. */
export function RarityRow({
  rarity,
  setRarity,
  counts,
}: {
  rarity: Rarity | null;
  setRarity: (r: Rarity | null) => void;
  counts: RarityCount;
}) {
  return (
    <div data-testid="galaxy-rarity-filter" className="flex flex-wrap gap-2">
      <TabChip
        label="All rarities"
        active={rarity === null}
        onClick={() => setRarity(null)}
        testid="galaxy-rarity-all"
      />
      {RARITIES.map((r) => (
        <TabChip
          key={r}
          label={`${RARITY_META[r].label} ${counts[r]}`}
          active={rarity === r}
          onClick={() => setRarity(r)}
          testid={`galaxy-rarity-${r}`}
          frame={RARITY_META[r].frame}
        />
      ))}
    </div>
  );
}

/**
 * Cover art for a category tile. `Theme` carries only `{ id, name }` today, so
 * a picker that wants a picture has to borrow one: the child's rarest owned
 * card in that category, falling back to the first card's art dimmed out. What
 * a picker *should* be given is fog on the map — this is the cheapest stand-in
 * that makes the tiles judgeable.
 */
export function coverFor(section: ThemeSectionData): {
  src: string;
  owned: boolean;
} {
  const order = [...RARITIES].reverse();
  for (const r of order) {
    const hit = section.cards.find((c) => c.owned && c.card.rarity === r);
    if (hit) return { src: hit.card.imageUrl, owned: true };
  }
  return { src: section.cards[0]?.card.imageUrl ?? "", owned: false };
}

/** Inflate the real sections to `target` themes so each take is judged at 25+. */
export function inflate(
  sections: ThemeSectionData[],
  target: number,
): ThemeSectionData[] {
  if (target <= sections.length) return sections;
  const out: ThemeSectionData[] = [...sections];
  let round = 1;
  while (out.length < target) {
    for (const s of sections) {
      if (out.length >= target) break;
      out.push({
        ...s,
        theme: { id: `${s.theme.id}-x${round}`, name: `${s.theme.name} ${round + 1}` },
      });
    }
    round += 1;
  }
  return out;
}
