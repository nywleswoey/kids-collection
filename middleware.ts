import { NextResponse } from "next/server";
import { auth } from "@/auth/config";
import { GATE_COOKIE, GATE_TTL_MS, makeToken, verifyGateToken } from "@/features/admin/gate-token";

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

  // Admin gate (U4-FR1): /admin/* needs a valid gate cookie, except the two
  // routes that EXIST to open it — the unlock prompt and passkey enrolment.
  // Enrolment is guarded by a fresh Google re-auth instead (requireFreshParent);
  // gating it behind the very gate a passkey opens would be circular.
  const isGateEntryRoute =
    path.startsWith("/admin/unlock") || path.startsWith("/admin/enrol");

  if (path.startsWith("/admin") && !isGateEntryRoute) {
    const secret = process.env.AUTH_SECRET ?? "";
    const token = req.cookies.get(GATE_COOKIE)?.value;
    const ok = await verifyGateToken(token, secret, Date.now());
    if (!ok) {
      return Response.redirect(new URL("/admin/unlock", req.nextUrl.origin));
    }
    // Inc15 FR1: slide the 20s window — re-issue the cookie on this valid
    // request so the gate closes only after 20s of no admin activity.
    const res = NextResponse.next();
    res.cookies.set(GATE_COOKIE, await makeToken(Date.now() + GATE_TTL_MS, secret), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(GATE_TTL_MS / 1000),
    });
    return res;
  }
});

export const config = {
  matcher: ["/play/:path*", "/admin/:path*"],
};
