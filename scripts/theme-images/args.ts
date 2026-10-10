/**
 * Strict argument parsing for `pnpm theme-images "<Theme Name>"`.
 *
 * Same `node:util parseArgs({ strict: true })` approach as
 * `scripts/supergrok-helper/args.ts` and `scripts/seed/args.ts` rather than ad
 * hoc `process.argv` checks.
 */
import { parseArgs as parseNodeArgs } from "node:util";

export class ThemeImagesArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemeImagesArgsError";
  }
}

export interface ThemeImagesArgs {
  themeName: string;
}

const USAGE =
  'Usage: pnpm theme-images "<Theme Name>"\n   The name must match seed-content/cards.json exactly.';

export function parseThemeImagesArgs(argv: readonly string[]): ThemeImagesArgs {
  let positionals: string[];
  try {
    ({ positionals } = parseNodeArgs({
      args: [...argv],
      options: {},
      strict: true,
      allowPositionals: true,
    }));
  } catch (err) {
    throw new ThemeImagesArgsError(
      `unrecognized command line: ${err instanceof Error ? err.message : String(err)}\n${USAGE}`,
    );
  }

  const themeName = positionals[0];
  if (!themeName) {
    throw new ThemeImagesArgsError(USAGE);
  }
  if (positionals.length > 1) {
    throw new ThemeImagesArgsError(`unexpected extra argument(s): ${positionals.slice(1).join(", ")}\n${USAGE}`);
  }

  return { themeName };
}
