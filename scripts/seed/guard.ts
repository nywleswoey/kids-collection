/**
 * Operator confirmation for destructive seed operations (Inc23 FR4–FR6).
 *
 * The ONLY module in the increment that prompts. Guards are an operator-interaction
 * concern and belong here, not in the writer module — a port method must never
 * prompt.
 *
 * The confirmation has exactly one input channel: an interactive TTY. There is no
 * --yes flag, no environment variable and no config file, by construction rather
 * than by check. That matters because the failure mode being defended against is a
 * stale value in `.env.local` — the very file that supplies the production
 * credential.
 */
import { createInterface } from "node:readline/promises";
import type { BlastRadius } from "@/features/pool/blast-radius";

export class DestructiveOperationAborted extends Error {
  constructor(reason: string) {
    super(`Aborted: ${reason}`);
    this.name = "DestructiveOperationAborted";
  }
}

function printReport(
  operation: "reset" | "prune",
  target: string,
  isProduction: boolean,
  radius: BlastRadius,
): void {
  const label = operation === "reset" ? "POOL RESET" : "SEED PRUNE";
  console.log(`\n${"─".repeat(64)}`);
  console.log(`${isProduction ? "⚠️  PRODUCTION" : "local"} — ${label}`);
  console.log(`Target: ${target}`);
  console.log(`${"─".repeat(64)}`);
  console.log(`Themes to delete:      ${radius.themes}`);
  console.log(`Cards to delete:       ${radius.cards}`);
  console.log(`Collection rows lost:  ${radius.collectionRows}`);

  if (radius.themeNames.length) {
    console.log(`\nThemes: ${radius.themeNames.join(", ")}`);
  }
  if (radius.perChild.length) {
    console.log("\nPer child:");
    for (const c of radius.perChild) {
      console.log(`  ${c.name.padEnd(20)} ${c.rows} card row(s)`);
    }
  }
  console.log(`${"─".repeat(64)}\n`);
}

/**
 * Show the blast radius, then require the operator to type the exact number of
 * collection rows about to be destroyed — which is only possible if they read
 * the report. Resolves on confirmation; throws otherwise.
 *
 * Local targets get the report but no prompt: the guard exists for production.
 */
export async function confirmDestructive(input: {
  operation: "reset" | "prune";
  target: string;
  isProduction: boolean;
  radius: BlastRadius;
}): Promise<void> {
  const { operation, target, isProduction, radius } = input;
  printReport(operation, target, isProduction, radius);

  if (!isProduction) return;

  if (!process.stdin.isTTY) {
    throw new DestructiveOperationAborted(
      "not an interactive terminal. A confirmation that can be piped in is not a " +
        "confirmation, so there is no bypass flag. Re-run this from a real terminal.",
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `Type the number of collection rows to destroy (${radius.collectionRows}) to proceed: `,
    );
    if (answer.trim() !== String(radius.collectionRows)) {
      throw new DestructiveOperationAborted(
        `expected "${radius.collectionRows}", got "${answer.trim()}". Nothing was written.`,
      );
    }
  } finally {
    rl.close();
  }
}
