import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = cookies();
  const token = cookieStore.get("gcal_token");
  return NextResponse.json({ connected: Boolean(token?.value) });
}


