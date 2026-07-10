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
      <div className="h-2 w-32 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-emerald-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums opacity-80">
        {owned} / {total}
      </span>
      {complete ? <span aria-label="complete">✅</span> : null}
    </div>
  );
}
