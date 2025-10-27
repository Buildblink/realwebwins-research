import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Route Protection Middleware
 * Phase 43-45: Protect authenticated routes + existing admin protection
 */

// Routes that require authentication
const PROTECTED_ROUTES = [
  /^\/dashboard/,
  /^\/studio/,
  /^\/tools/,
];

// Routes that are always public (no auth check)
const PUBLIC_ROUTES = [
  "/",
  "/research",
  "/research/browse",
  "/vault",
  "/cases",
  "/docs",
  "/auth/signin",
  "/auth/signup",
  "/public",
  "/showcase",
  "/pain-points",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const res = NextResponse.next();

  // 1. Admin path protection (existing logic)
  const isAdminPath = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  if (isAdminPath && process.env.ADMIN_MODE !== "true") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 2. Skip auth check for API routes, static files, and public routes
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|woff|woff2)$/) ||
    PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))
  ) {
    return res;
  }

  // 3. Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((pattern) => pattern.test(pathname));

  if (isProtectedRoute) {
    const supabase = createMiddlewareClient({ req: request, res });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If no session, redirect to sign in
    if (!session) {
      const redirectUrl = new URL("/auth/signin", request.url);
      redirectUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
