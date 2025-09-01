import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const AUTH_ROOT = process.env.GOOGLE_AUTH_ROOT ?? "http://localhost:3022";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect("/" + "?error=missing_code");

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${AUTH_ROOT}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenJson?.error_description || "OAuth failed");

    const cookieStore = cookies();
    cookieStore.set("gcal_token", JSON.stringify(tokenJson), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return NextResponse.redirect("/");
  } catch (e) {
    return NextResponse.redirect("/" + "?error=oauth_failed");
  }
}


