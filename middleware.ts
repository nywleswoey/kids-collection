import { auth } from "@/auth/config";
import { verifyToken } from "@/features/admin/gate-token";

const GATE_COOKIE = "kc.admin.gate";

/**
 * Gate protected routes. Non-allowlisted users never get a session
 * (signIn callback denies them), so session presence ≈ parent.
 * Pages still call requireParent() / requireAdminGate() for defense in depth.
 */
export default auth(async (req) => {
  const isAuthed = !!req.auth;
  const path = req.nextUrl.pathname;
  const isProtected = path.startsWith("/play") || path.startsWith("/admin");

  if (isProtected && !isAuthed) {
    return Response.redirect(new URL("/signin", req.nextUrl.origin));
  }

  // Admin passcode gate (U4-FR1): /admin/* except the unlock page needs a valid
  // gate cookie. First layer; admin pages re-check via requireAdminGate().
  if (path.startsWith("/admin") && !path.startsWith("/admin/unlock")) {
    const token = req.cookies.get(GATE_COOKIE)?.value;
    const ok = await verifyToken(token, process.env.AUTH_SECRET ?? "", Date.now());
    if (!ok) {
      return Response.redirect(new URL("/admin/unlock", req.nextUrl.origin));
    }
  }
});

export const config = {
  matcher: ["/play/:path*", "/admin/:path*"],
};
