import { NextRequest, NextResponse } from "next/server";

const AUTH_ROOT = process.env.GOOGLE_AUTH_ROOT ?? "http://localhost:3022";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${AUTH_ROOT}/api/auth/google/callback`;
  const scope = encodeURIComponent("https://www.googleapis.com/auth/calendar.events");
  const state = Math.random().toString(36).slice(2);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(clientId ?? "")}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  return NextResponse.redirect(url);
}


