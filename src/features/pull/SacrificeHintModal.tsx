"use client";

import Link from "next/link";
import { CenteredModal } from "@/features/ui/CenteredModal";

/**
 * First-duplicate easter-egg hint (Inc13 FR4). Kid-friendly one-time modal that
 * teaches the sacrifice-to-upgrade trick the very first time a child pulls a
 * duplicate. "Show me!" jumps to the card in their galaxy; "Got it" dismisses.
 */
export function SacrificeHintModal({
  open,
  cardId,
  onClose,
}: {
  open: boolean;
  cardId: string;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <CenteredModal testId="sacrifice-hint-modal" labelledBy="sacrifice-hint-title">
      <span className="pill pill--gold text-base">✨ Secret trick! ✨</span>
      <h2 id="sacrifice-hint-title" className="text-xl font-bold">
        You got a double!
      </h2>
      <p className="text-[color:var(--ink)]">
        Snap! You already have this card. Got doubles? You can trade them in to
        power up and win a rarer card! ✨
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={`/play/binder/${cardId}`}
          onClick={onClose}
          data-testid="sacrifice-hint-show-me"
          className="btn btn--primary press font-bold"
        >
          Show me!
        </Link>
        <button
          type="button"
          onClick={onClose}
          data-testid="sacrifice-hint-dismiss"
          className="btn btn--ghost"
        >
          Got it
        </button>
      </div>
    </CenteredModal>
  );
}
