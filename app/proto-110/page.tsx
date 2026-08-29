import { notFound } from "next/navigation";
import { Suspense } from "react";
import { pgCatalog } from "@/features/pool/catalog.pg";
import { Prototype110 } from "@/features/trade/prototype-110/Prototype110";

/**
 * PROTOTYPE — #110. Throwaway route; dies with the
 * `prototype/110-one-away-flag` branch.
 *
 * It sits OUTSIDE `/play` on purpose: `middleware.ts` matches `/play/:path*`
 * and bounces to Google sign-in, which a prototype can't hold. Everything
 * below the header is the real swap board's markup and the real card art, so
 * the tiles are judged at production density; only the sign-in and the friend
 * strip are missing. Dev-only — 404s in production.
 */
export default async function Proto110Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const pool = await pgCatalog.listCards();

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="pill pill--gold">🤝 Trading post</span>
        <h1 className="text-3xl font-bold">
          Swap doubles, <span className="title-pop">Sam</span>!
        </h1>
        <p className="text-sm text-[color:var(--ink-soft)]">
          Pick a friend, then swap a double for one of theirs — same rarity. 🎁 marks a card the
          other player doesn&apos;t have yet.
        </p>
      </div>
      <Suspense fallback={null}>
        <Prototype110 pool={pool} />
      </Suspense>
    </main>
  );
}
