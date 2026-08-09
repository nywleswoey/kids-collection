// SCRATCH — deliberate type error. Proves the `typecheck` gate reports red (#23).
// Nothing imports this file: tsconfig's `include` is `**/*.ts`, so `tsc --noEmit`
// sees it regardless, while vitest (esbuild, types stripped not checked) does not.
export const notANumber: number = "this is a string";
