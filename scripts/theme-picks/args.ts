/**
 * Strict argument parsing for `pnpm theme-picks "<Theme Name>" [--use "<Card Name>=<provider>"]...`.
 *
 * Same `node:util parseArgs({ strict: true })` approach as
 * `scripts/theme-images/args.ts`. `--use` is repeatable (`multiple: true`);
 * each occurrence is split on its first `=` only, so a provider id or alias
 * can never itself contain one.
 */
import { parseArgs as parseNodeArgs } from "node:util";

export class ThemePicksArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemePicksArgsError";
  }
}

export interface ThemePicksUse {
  cardName: string;
  /** Not yet alias-resolved or validated — the caller does both against the registry. */
  providerRaw: string;
}

export interface ThemePicksArgs {
  themeName: string;
  uses: readonly ThemePicksUse[];
}

const USAGE =
  'Usage: pnpm theme-picks "<Theme Name>" [--use "<Card Name>=<provider>"]...\n' +
  "   The theme name must match seed-content/cards.json exactly.\n" +
  '   --use may be repeated; <provider> is a registered provider id (see\n' +
  "   src/shared/pool/providers/index.ts) or a short alias such as grok/cloudflare.";

export function parseThemePicksArgs(argv: readonly string[]): ThemePicksArgs {
  let values: Record<string, unknown>;
  let positionals: string[];
  try {
    ({ values, positionals } = parseNodeArgs({
      args: [...argv],
      options: {
        use: { type: "string", multiple: true },
      },
      strict: true,
      allowPositionals: true,
    }));
  } catch (err) {
    throw new ThemePicksArgsError(
      `unrecognized command line: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`,
    );
  }

  const themeName = positionals[0];
  if (!themeName) {
    throw new ThemePicksArgsError(USAGE);
  }
  if (positionals.length > 1) {
    throw new ThemePicksArgsError(`unexpected extra argument(s): ${positionals.slice(1).join(", ")}\n${USAGE}`);
  }

  const rawUses = (values.use as string[] | undefined) ?? [];
  const uses = rawUses.map((raw) => {
    const eq = raw.indexOf("=");
    if (eq <= 0 || eq === raw.length - 1) {
      throw new ThemePicksArgsError(`--use "${raw}" must be of the form "<Card Name>=<provider>".\n${USAGE}`);
    }
    return { cardName: raw.slice(0, eq).trim(), providerRaw: raw.slice(eq + 1).trim() };
  });

  return { themeName, uses };
}
