import type { QuizVisual } from "./types";

/**
 * Bar model for fraction prompts (Inc25 FR14) — a rectangle in `parts` equal
 * segments, `shaded` of them filled.
 *
 * Built from two integers computed by a pure generator, never from markup in
 * the data: no `dangerouslySetInnerHTML` on a child-facing screen (NFR10).
 * Every segment is stroked, so filled/empty reads without relying on hue.
 * A viewBox with width:100% scales it to the panel rather than pinning a pixel
 * width that would overflow a phone.
 */
export function BarModel({ parts, shaded }: Omit<QuizVisual, "kind">) {
  const W = 100;
  const H = 22;
  const seg = W / parts;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full max-w-[18rem]"
      role="img"
      aria-label={`A bar in ${parts} equal parts, ${shaded} shaded`}
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: parts }, (_, i) => (
        <rect
          key={i}
          x={i * seg}
          y={0.6}
          width={seg}
          height={H - 1.2}
          // --brand-1 (warm gold) is the app's existing "this is the good bit"
          // accent, same family as .pill--gold. Filled vs empty is the signal;
          // the stroke keeps every segment visible either way.
          fill={i < shaded ? "var(--brand-1)" : "transparent"}
          stroke="currentColor"
          strokeWidth={0.8}
        />
      ))}
    </svg>
  );
}
