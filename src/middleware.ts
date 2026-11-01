import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Bypass public files, icons, fonts, and auth API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/app-icon") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/manifest.json")
  ) {
    return NextResponse.next();
  }

  // 2. Read session token from cookie
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = token ? await verifySessionToken(token) : false;

  // 3. If on /login page
  if (pathname === "/login") {
    if (isAuthenticated) {
      // Already logged in, redirect to root which routes to /mobile or /web
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 4. If unauthenticated, redirect to /login
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
