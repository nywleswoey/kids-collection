import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isAllowlistedParent } from "@/features/auth/access";

/**
 * Auth.js (NextAuth v5) — Google OAuth, parent allowlist enforced fail-closed.
 * Env (server-only): AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, PARENT_EMAILS.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    // Deny authentication outright for non-allowlisted emails (U2-SEC-2/3, fail-closed).
    signIn({ user }) {
      return isAllowlistedParent(user.email);
    },
    // Stamp when Google actually authenticated. `account` is present only on a
    // real sign-in, not on subsequent token refreshes, so this records the last
    // genuine authentication rather than the last request. Passkey enrolment
    // requires a recent value (parent-gate-auth); nothing else reads it.
    jwt({ token, account }) {
      if (account) token.authTime = Math.floor(Date.now() / 1000);
      return token;
    },
    // Copy token.sub (Google's stable user ID) to session so analytics can use it as distinct id.
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      // JWT claims are an untyped bag; validate rather than trust the shape, so a
      // malformed or absent authTime reads as "not fresh" instead of leaking
      // through as NaN.
      session.authTime = typeof token.authTime === "number" ? token.authTime : undefined;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
