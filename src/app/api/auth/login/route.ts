import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const PASSWORD = "levcom25"
const COOKIE_NAME = "auth_token"
const COOKIE_MAX_AGE = 180 * 24 * 60 * 60 // 180 Tage in Sekunden

export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (password === PASSWORD) {
      const cookieStore = await cookies()
      cookieStore.set(COOKIE_NAME, "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: COOKIE_MAX_AGE,
        path: "/",
      })

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: "Ungültiges Passwort" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: "Fehler beim Verarbeiten der Anfrage" }, { status: 500 })
  }
}


