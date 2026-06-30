import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { isParentEmail, parseAllowlist } from "@/features/auth/policy";

/**
 * Auth.js (NextAuth v5) — Google OAuth, parent allowlist enforced fail-closed.
 * Env (server-only): AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, PARENT_EMAILS.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    // Deny authentication outright for non-allowlisted emails (U2-SEC-2/3, fail-closed).
    signIn({ user }) {
      return isParentEmail(user.email, parseAllowlist(process.env.PARENT_EMAILS));
    },
  },
  pages: {
    signIn: "/signin",
  },
});
