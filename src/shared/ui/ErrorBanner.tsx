import type { ReactNode } from "react";

/**
 * Kid-facing error paragraph. Renders nothing when `message` is falsy, so
 * callers can drop the surrounding `error ? ... : null` ternary. Defaults to
 * the panel-styled banner; pass `className` to override for inline variants.
 */
export function ErrorBanner({
  testId,
  message,
  className = "panel px-5 py-3 text-center text-sm text-red-300",
}: {
  testId: string;
  message: ReactNode;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p data-testid={testId} className={className}>
      {message}
    </p>
  );
}
