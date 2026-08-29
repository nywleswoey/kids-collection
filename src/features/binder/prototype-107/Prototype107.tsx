"use client";

/**
 * PROTOTYPE — #107. Throwaway. Do not import this from production code.
 *
 * The question: 17 category chips in one wrapped sticky row grow forever — a
 * theme lands every seed run. What replaces them?
 *
 * Four takes on the existing `/play/binder` route, switchable via `?variant=`,
 * plus a `?themes=` inflater so every take is judged at 25 and 32 categories
 * and not just at today's 16:
 *
 *   now — today's wrapped sticky chip row (the control)
 *   A   — picker screen: a category is a place you go, not a filter you apply
 *   B   — scroll strip: one snap rail, edge fade, position counter
 *   C   — drawer: one button naming the selection, full-screen tile sheet
 *
 * The bar is dev-only (`NODE_ENV !== "production"`) so a stray merge cannot
 * ship it. The winner gets rewritten properly; the rest die on the
 * `prototype/107-category-picker` branch.
 */

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ThemeSection as ThemeSectionData } from "@/lib/types";
import { GalaxyView } from "../GalaxyView";
import { VariantAPickerScreen, VARIANT_A_NAME } from "./VariantA-PickerScreen";
import { VariantBScrollStrip, VARIANT_B_NAME } from "./VariantB-ScrollStrip";
import { VariantCDrawer, VARIANT_C_NAME } from "./VariantC-Drawer";
import { inflate } from "./shared";

const VARIANTS = ["now", "A", "B", "C"] as const;
type VariantKey = (typeof VARIANTS)[number];

const NAMES: Record<VariantKey, string> = {
  now: "Today — wrapped sticky chip row",
  A: VARIANT_A_NAME,
  B: VARIANT_B_NAME,
  C: VARIANT_C_NAME,
};

const THEME_COUNTS = [16, 25, 32];

export function Prototype107({ sections }: { sections: ThemeSectionData[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const raw = params.get("variant");
  const variant: VariantKey = (VARIANTS as readonly string[]).includes(raw ?? "")
    ? (raw as VariantKey)
    : "now";
  const themes = Number(params.get("themes") ?? sections.length) || sections.length;

  const go = useCallback(
    (next: Partial<{ variant: VariantKey; themes: number }>) => {
      const q = new URLSearchParams(params.toString());
      if (next.variant) q.set("variant", next.variant);
      if (next.themes) q.set("themes", String(next.themes));
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const cycle = useCallback(
    (delta: number) => {
      const i = VARIANTS.indexOf(variant);
      go({ variant: VARIANTS[(i + delta + VARIANTS.length) % VARIANTS.length] });
    },
    [variant, go],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycle]);

  const shown = inflate(sections, themes);

  return (
    <>
      {variant === "now" ? <GalaxyView sections={shown} /> : null}
      {variant === "A" ? <VariantAPickerScreen key={themes} sections={shown} /> : null}
      {variant === "B" ? <VariantBScrollStrip key={themes} sections={shown} /> : null}
      {variant === "C" ? <VariantCDrawer key={themes} sections={shown} /> : null}

      <div
        className="fixed inset-x-0 bottom-3 z-[100] flex justify-center px-3"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex max-w-full flex-col items-center gap-1 rounded-2xl border-2 border-dashed border-fuchsia-400 bg-black/90 px-3 py-2 text-white shadow-2xl"
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => cycle(-1)}
              className="rounded-lg bg-white/15 px-2 py-1 text-sm"
            >
              ←
            </button>
            <span className="truncate text-xs font-bold">
              #107 · {variant} — {NAMES[variant]}
            </span>
            <button
              type="button"
              onClick={() => cycle(1)}
              className="rounded-lg bg-white/15 px-2 py-1 text-sm"
            >
              →
            </button>
          </div>
          <div className="flex items-center gap-1 text-[0.7rem]">
            <span className="opacity-60">themes:</span>
            {THEME_COUNTS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => go({ themes: n })}
                className={`rounded px-2 py-0.5 font-bold ${
                  themes === n ? "bg-fuchsia-400 text-black" : "bg-white/15"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
