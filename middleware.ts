import { auth } from "@/auth/config";

/**
 * Gate protected routes. Non-allowlisted users never get a session
 * (signIn callback denies them), so session presence ≈ parent.
 * Pages still call requireParent() for defense in depth.
 */
export default auth((req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith("/play") || path.startsWith("/admin");

  if (isProtected && !isAuthed) {
    const url = new URL("/signin", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/play/:path*", "/admin/:path*"],
};
