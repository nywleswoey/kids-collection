/**
 * Spendable/grantable integer columns on the `children` table (Inc19): the normal
 * pull token and the unified Easter Egg ticket. Shared by token-service (grant),
 * pull-service (spend), and the ChildStore adapters, which drive atomic per-column
 * updates off this string key.
 *
 * (Kept at this path to avoid churn across the ChildStore seam; the former
 * per-rarity / special-ticket column helpers were removed when the six ticket
 * columns collapsed into one.)
 */
export type BalanceColumn = "pullTokens" | "easterEggTickets";
