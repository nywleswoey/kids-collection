"use client";

/**
 * PROTOTYPE — #110. Throwaway. Do not import this from production code.
 *
 * The question: #109 ships a second tier — the receiver holds SACRIFICE_MIN - 1,
 * so one more copy makes it burnable — ordered but UNMARKED. How does a tile
 * say it, without a child reading it as the galaxy's 🔥 ("burnable NOW"), and
 * without leaving out whose shelf it is about?
 *
 * Five takes on the real `/play/trade` route, switchable via `?variant=`, plus
 * a `?mix=` dial so each is judged when the column is half one-away and not
 * just when it holds one:
 *
 *   now — order only, tier 2 says nothing (what #109 shipped — the control)
 *   A   — twin badge in the tier-1 slot, amber, naming the receiver
 *   B   — bands: the column says it once, every tile stays clean
 *   C   — the receiver's shelf on the tile: "Ana 3 → 4 🔥"
 *   D   — wordless ember ring, explained once per column
 *
 * The bar is dev-only (`NODE_ENV !== "production"`) so a stray merge can't ship
 * it. The winner gets rewritten properly into `TradeBoard`; the rest die on the
 * `prototype/110-one-away-flag` branch.
 */

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Card } from "@/lib/types";
import { Control, CONTROL_NAME } from "./Control";
import { VariantATwinBadge, VARIANT_A_NAME } from "./VariantA-TwinBadge";
import { VariantBBands, VARIANT_B_NAME } from "./VariantB-Bands";
import { VariantCProgress, VARIANT_C_NAME } from "./VariantC-Progress";
import { VariantDEmber, VARIANT_D_NAME } from "./VariantD-Ember";
import { MIXES, MIX_LABEL, type Mix } from "./shared";

const VARIANTS = ["now", "A", "B", "C", "D"] as const;
type VariantKey = (typeof VARIANTS)[number];

const NAMES: Record<VariantKey, string> = {
  now: CONTROL_NAME,
  A: VARIANT_A_NAME,
  B: VARIANT_B_NAME,
  C: VARIANT_C_NAME,
  D: VARIANT_D_NAME,
};

export function Prototype110({ pool }: { pool: Card[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const rawVariant = params.get("variant");
  const variant: VariantKey = (VARIANTS as readonly string[]).includes(rawVariant ?? "")
    ? (rawVariant as VariantKey)
    : "now";
  const rawMix = params.get("mix");
  const mix: Mix = (MIXES as readonly string[]).includes(rawMix ?? "")
    ? (rawMix as Mix)
    : "real";

  const go = useCallback(
    (next: Partial<{ variant: VariantKey; mix: Mix }>) => {
      const q = new URLSearchParams(params.toString());
      if (next.variant) q.set("variant", next.variant);
      if (next.mix) q.set("mix", next.mix);
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
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA" || t?.isContentEditable) return;
      if (e.key === "ArrowLeft") cycle(-1);
      if (e.key === "ArrowRight") cycle(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycle]);

  const Take = {
    now: Control,
    A: VariantATwinBadge,
    B: VariantBBands,
    C: VariantCProgress,
    D: VariantDEmber,
  }[variant];

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-5 pb-32">
      <Take pool={pool} mix={mix} />

      <div className="panel fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-5xl flex-col gap-2 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill--gold text-xs">PROTOTYPE #110</span>
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => go({ variant: v })}
              className={`btn ${v === variant ? "btn--primary" : "btn--ghost"} text-xs`}
            >
              {v}
            </button>
          ))}
          <span className="font-semibold">{NAMES[variant]}</span>
          <span className="text-[color:var(--ink-soft)]">← → to switch</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[color:var(--ink-soft)]">mix:</span>
          {MIXES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => go({ mix: m })}
              className={`btn ${m === mix ? "btn--primary" : "btn--ghost"} text-xs`}
            >
              {m}
            </button>
          ))}
          <span className="text-xs text-[color:var(--ink-soft)]">{MIX_LABEL[mix]}</span>
        </div>
      </div>
    </div>
  );
}
