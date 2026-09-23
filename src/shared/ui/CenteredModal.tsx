import type { ReactNode } from "react";

/**
 * Shared centered-dialog shell: full-screen dimmed overlay with a centered
 * `panel` card. Used by the one-off kid-facing modals (sacrifice hint,
 * collection-reward celebration). Callers own the panel contents and, where
 * needed, the surrounding portal.
 */
export function CenteredModal({
  children,
  testId,
  labelledBy,
}: {
  children: ReactNode;
  testId: string;
  labelledBy?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      data-testid={testId}
    >
      <div className="panel flex max-w-sm flex-col items-center gap-4 p-6 text-center">
        {children}
      </div>
    </div>
  );
}
