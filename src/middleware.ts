import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const COOKIE_NAME = "auth_token"
const PUBLIC_PATHS = ["/login", "/api/auth/login"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Öffentliche Pfade erlauben
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // API-Routen für Cron-Jobs erlauben (werden von Vercel aufgerufen)
  if (pathname.startsWith("/api/cron")) {
    return NextResponse.next()
  }

  // Prüfe Authentifizierung
  const authToken = request.cookies.get(COOKIE_NAME)

  if (!authToken || authToken.value !== "authenticated") {
    // Redirect zur Login-Seite
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

