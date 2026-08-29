export function ProgressBar({
  themeId,
  owned,
  total,
  complete,
}: {
  themeId: string;
  owned: number;
  total: number;
  complete: boolean;
}) {
  const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2" data-testid={`theme-progress-${themeId}`}>
      <div className="h-2.5 w-32 overflow-hidden rounded-full bg-black/30 ring-1 ring-inset ring-white/10">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-4),var(--brand-1))] shadow-[0_0_10px_rgba(67,230,200,0.6)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums text-[color:var(--ink-soft)]">
        {owned} / {total}
      </span>
      {/* Same 🏆 the picker tile and the reward modal use, so "this set is
          finished" is one symbol the child learns once rather than three. */}
      {complete ? <span aria-label="Set complete">🏆</span> : null}
    </div>
  );
}
