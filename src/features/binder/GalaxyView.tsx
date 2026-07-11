"use client";

import { useState } from "react";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { ThemeSection } from "./ThemeSection";

/**
 * Galaxy category view (Inc9 FR1). Sticky tab bar of category chips filters the
 * galaxy to one theme; "★ All" (default) shows every section. Scales as the
 * number of categories grows.
 */
export function GalaxyView({ sections }: { sections: ThemeSectionData[] }) {
  const [active, setActive] = useState<string>("all");

  const visible =
    active === "all"
      ? sections
      : sections.filter((s) => s.theme.id === active);

  return (
    <div className="flex flex-col gap-6">
      <nav
        data-testid="galaxy-tabs"
        className="panel sticky top-24 z-[9] flex flex-wrap gap-2 p-3 backdrop-blur"
      >
        <TabChip
          label="★ All"
          active={active === "all"}
          onClick={() => setActive("all")}
          testid="galaxy-tab-all"
        />
        {sections.map((s) => (
          <TabChip
            key={s.theme.id}
            label={s.theme.name}
            active={active === s.theme.id}
            onClick={() => setActive(s.theme.id)}
            testid={`galaxy-tab-${s.theme.id}`}
          />
        ))}
      </nav>

      {visible.map((section) => (
        <ThemeSection key={section.theme.id} section={section} />
      ))}
    </div>
  );
}

function TabChip({
  label,
  active,
  onClick,
  testid,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testid}
      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--brand-1)] text-black ring-2 ring-[color:var(--brand-1)]"
          : "bg-white/10 text-[color:var(--ink)] hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}
